import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  getCustomProviderAddressSpace,
  getProviderPreset,
  isProviderPresetId,
  normalizeCustomBaseUrl,
} from '@/services/provider-catalog';
import type {
  ApiStyle,
  Provider,
  ProviderPresetId,
} from '@/services/provider-catalog';

export {
  buildCustomProviderUrl,
  getCustomProviderAddressSpace,
  getProviderPreset,
  isProviderPresetId,
  LOCAL_PROVIDER_PRESETS,
  normalizeCustomBaseUrl,
  PROVIDER_PRESETS,
  REMOTE_PROVIDER_PRESETS,
} from '@/services/provider-catalog';
export type {
  ApiStyle,
  LocalNetworkAddressSpace,
  Provider,
  ProviderCredentialPolicy,
  ProviderPreset,
  ProviderPresetCategory,
  ProviderPresetId,
} from '@/services/provider-catalog';

export interface CustomProviderSettings {
  preset: ProviderPresetId;
  baseUrl: string;
  /** Explicit opt-in for unencrypted loopback or private-network endpoints. */
  allowLocalHttp: boolean;
  apiKey: string;
  model: string;
  apiStyle: ApiStyle;
  /** JSON object of additional request headers. Values are treated as secrets. */
  headersJson: string;
}

export interface ProviderSettings {
  provider: Provider;
  custom: CustomProviderSettings;
}

export interface ProviderSettingsInput {
  provider?: Provider;
  custom?: Partial<CustomProviderSettings>;
}

interface PersistedProviderSettingsV3 {
  version: 3;
  provider: Provider;
  custom: Pick<
    CustomProviderSettings,
    'preset' | 'baseUrl' | 'allowLocalHttp' | 'model' | 'apiStyle'
  >;
}

type PersistedProviderSettings = PersistedProviderSettingsV3;

interface InMemoryCredentials {
  apiKey: string;
  headersJson: string;
}

const SETTINGS_STORAGE_KEY = 'cyberpath.provider-settings.v1';
const API_KEY_SECURE_STORE_KEY = 'cyberpath.custom-provider.api-key.v1';
const HEADERS_SECURE_STORE_KEY = 'cyberpath.custom-provider.headers.v1';
const MAX_API_KEY_LENGTH = 8_192;
const MAX_HEADERS_JSON_LENGTH = 12_000;
const MAX_HEADER_COUNT = 32;
const MAX_HEADER_VALUE_LENGTH = 8_192;
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const FORBIDDEN_HEADER_NAMES = new Set([
  'connection',
  'content-length',
  'host',
  'transfer-encoding',
]);

export const IS_PUBLIC_DEMO =
  process.env.EXPO_PUBLIC_PUBLIC_DEMO === 'true';
export const BUILT_IN_OPENAI_AVAILABLE = !IS_PUBLIC_DEMO;
export const PUBLIC_DEMO_OPENAI_UNAVAILABLE_MESSAGE =
  'Built-in OpenAI is unavailable in this public demo. Choose Local AI or Custom / cloud.';

const PRIVATE_DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  provider: 'openai',
  custom: {
    preset: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    allowLocalHttp: false,
    apiKey: '',
    model: 'gpt-5.6-luna',
    apiStyle: 'responses',
    headersJson: '',
  },
};

function createPublicDemoDefaults(): ProviderSettings {
  const preset = getProviderPreset('ollama-local');
  return {
    provider: 'custom',
    custom: {
      preset: preset.id,
      baseUrl: preset.defaultBaseUrl,
      allowLocalHttp: false,
      apiKey: '',
      model: preset.defaultModel,
      apiStyle: preset.defaultApiStyle,
      headersJson: '',
    },
  };
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = BUILT_IN_OPENAI_AVAILABLE
  ? PRIVATE_DEFAULT_PROVIDER_SETTINGS
  : createPublicDemoDefaults();

let webCredentials: InMemoryCredentials = {
  apiKey: '',
  headersJson: '',
};

function cloneDefaults(): ProviderSettings {
  return {
    provider: DEFAULT_PROVIDER_SETTINGS.provider,
    custom: { ...DEFAULT_PROVIDER_SETTINGS.custom },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiStyle(value: unknown): value is ApiStyle {
  return value === 'responses' || value === 'chat-completions';
}

function isProvider(value: unknown): value is Provider {
  return value === 'openai' || value === 'custom';
}

export function parseCustomHeaders(headersJson: string): Record<string, string> {
  const source = headersJson.trim();
  if (!source) {
    return {};
  }

  if (source.length > MAX_HEADERS_JSON_LENGTH) {
    throw new Error('The custom headers JSON is too large.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('Custom headers must be a valid JSON object.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Custom headers must be a JSON object with string values.');
  }

  const entries = Object.entries(parsed);
  if (entries.length > MAX_HEADER_COUNT) {
    throw new Error(`Use no more than ${MAX_HEADER_COUNT} custom headers.`);
  }

  const headers: Record<string, string> = {};
  for (const [rawName, rawValue] of entries) {
    const name = rawName.trim();
    const lowerName = name.toLowerCase();

    if (!name || !HEADER_NAME_PATTERN.test(name)) {
      throw new Error(`"${rawName}" is not a valid HTTP header name.`);
    }

    if (FORBIDDEN_HEADER_NAMES.has(lowerName)) {
      throw new Error(`The ${name} header is managed by the network client and cannot be set.`);
    }

    if (typeof rawValue !== 'string') {
      throw new Error(`The ${name} header value must be a string.`);
    }

    if (rawValue.length > MAX_HEADER_VALUE_LENGTH) {
      throw new Error(`The ${name} header value is too long.`);
    }

    if (/\r|\n/u.test(rawValue)) {
      throw new Error(`The ${name} header value cannot contain line breaks.`);
    }

    headers[name] = rawValue;
  }

  return headers;
}

export function validateCustomProviderSettings(
  settings: CustomProviderSettings,
): CustomProviderSettings {
  const apiKey = settings.apiKey.trim();
  if (apiKey.length > MAX_API_KEY_LENGTH) {
    throw new Error('The custom provider API key is too long.');
  }

  const model = settings.model.trim();
  if (!model) {
    throw new Error('Enter the model name used by the custom provider.');
  }

  if (model.length > 200 || /\r|\n/u.test(model)) {
    throw new Error('Enter a valid custom provider model name.');
  }

  if (!isApiStyle(settings.apiStyle)) {
    throw new Error('Choose either the Responses or Chat Completions API style.');
  }

  if (!isProviderPresetId(settings.preset)) {
    throw new Error('Choose a supported custom or cloud gateway preset.');
  }

  const headersJson = settings.headersJson.trim();
  parseCustomHeaders(headersJson);

  return {
    preset: settings.preset,
    baseUrl: normalizeCustomBaseUrl(settings.baseUrl, settings.allowLocalHttp),
    allowLocalHttp: settings.allowLocalHttp === true,
    apiKey,
    model,
    apiStyle: settings.apiStyle,
    headersJson,
  };
}

function readPersistedSettings(rawValue: string | null): PersistedProviderSettings | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (
      !isRecord(parsed) ||
      (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) ||
      !isProvider(parsed.provider)
    ) {
      return null;
    }

    if (!isRecord(parsed.custom)) {
      return null;
    }

    const rawBaseUrl =
      typeof parsed.custom.baseUrl === 'string'
        ? parsed.custom.baseUrl
        : DEFAULT_PROVIDER_SETTINGS.custom.baseUrl;
    const allowLocalHttp =
      (parsed.version === 3 && parsed.custom.allowLocalHttp === true) ||
      (parsed.version < 3 &&
        rawBaseUrl.trim().toLowerCase().startsWith('http://') &&
        getCustomProviderAddressSpace(rawBaseUrl) === 'loopback');
    const baseUrl =
      normalizeCustomBaseUrl(rawBaseUrl, allowLocalHttp);
    const model =
      typeof parsed.custom.model === 'string' && parsed.custom.model.trim()
        ? parsed.custom.model.trim().slice(0, 200)
        : DEFAULT_PROVIDER_SETTINGS.custom.model;
    const apiStyle = isApiStyle(parsed.custom.apiStyle)
      ? parsed.custom.apiStyle
      : DEFAULT_PROVIDER_SETTINGS.custom.apiStyle;
    const preset =
      parsed.version >= 2 && isProviderPresetId(parsed.custom.preset)
        ? parsed.custom.preset
        : DEFAULT_PROVIDER_SETTINGS.custom.preset;

    return {
      version: 3,
      provider: parsed.provider,
      custom: { preset, baseUrl, allowLocalHttp, model, apiStyle },
    };
  } catch {
    return null;
  }
}

async function loadCredentials(): Promise<InMemoryCredentials> {
  if (Platform.OS === 'web') {
    return { ...webCredentials };
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return { apiKey: '', headersJson: '' };
  }

  const [apiKey, headersJson] = await Promise.all([
    SecureStore.getItemAsync(API_KEY_SECURE_STORE_KEY),
    SecureStore.getItemAsync(HEADERS_SECURE_STORE_KEY),
  ]);

  let validatedHeadersJson = headersJson ?? '';
  try {
    parseCustomHeaders(validatedHeadersJson);
  } catch {
    validatedHeadersJson = '';
  }

  return {
    apiKey: apiKey ?? '',
    headersJson: validatedHeadersJson,
  };
}

async function saveCredentials(credentials: InMemoryCredentials): Promise<void> {
  if (Platform.OS === 'web') {
    webCredentials = { ...credentials };
    return;
  }

  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Secure credential storage is unavailable on this device.');
  }

  const options: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };

  await Promise.all([
    credentials.apiKey
      ? SecureStore.setItemAsync(API_KEY_SECURE_STORE_KEY, credentials.apiKey, options)
      : SecureStore.deleteItemAsync(API_KEY_SECURE_STORE_KEY, options),
    credentials.headersJson
      ? SecureStore.setItemAsync(HEADERS_SECURE_STORE_KEY, credentials.headersJson, options)
      : SecureStore.deleteItemAsync(HEADERS_SECURE_STORE_KEY, options),
  ]);
}

export async function getProviderSettings(): Promise<ProviderSettings> {
  const [rawSettings, credentials] = await Promise.all([
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
    loadCredentials(),
  ]);
  const persisted = readPersistedSettings(rawSettings);
  const blockedStoredOpenAI =
    IS_PUBLIC_DEMO && persisted?.provider === 'openai';
  const settings = cloneDefaults();

  if (persisted && !blockedStoredOpenAI) {
    settings.provider = persisted.provider;
    settings.custom = {
      ...settings.custom,
      ...persisted.custom,
    };
  }

  if (!IS_PUBLIC_DEMO || persisted?.provider === 'custom') {
    settings.custom.apiKey = credentials.apiKey;
    settings.custom.headersJson = credentials.headersJson;
  }

  if (blockedStoredOpenAI) {
    await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY).catch(() => undefined);
  }

  return settings;
}

export const loadProviderSettings = getProviderSettings;

export async function saveProviderSettings(
  input: ProviderSettingsInput,
): Promise<ProviderSettings> {
  const current = await getProviderSettings();
  const provider = input.provider ?? current.provider;

  if (!isProvider(provider)) {
    throw new Error('Choose either OpenAI or a custom provider.');
  }

  if (IS_PUBLIC_DEMO && provider === 'openai') {
    throw new Error(PUBLIC_DEMO_OPENAI_UNAVAILABLE_MESSAGE);
  }

  const candidate: CustomProviderSettings = {
    ...current.custom,
    ...input.custom,
  };
  const custom =
    provider === 'custom'
      ? validateCustomProviderSettings(candidate)
      : current.custom;

  const persisted: PersistedProviderSettings = {
    version: 3,
    provider,
    custom: {
      preset: custom.preset,
      baseUrl: custom.baseUrl,
      allowLocalHttp: custom.allowLocalHttp,
      model: custom.model,
      apiStyle: custom.apiStyle,
    },
  };

  // Custom header values can contain credentials, so they share the secret-storage
  // policy with the API key and are never written to AsyncStorage on web.
  await saveCredentials({ apiKey: custom.apiKey, headersJson: custom.headersJson });
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(persisted));

  return { provider, custom };
}

export async function clearCustomProviderCredentials(): Promise<void> {
  await saveCredentials({ apiKey: '', headersJson: '' });
}

export async function resetProviderSettings(): Promise<ProviderSettings> {
  await Promise.all([
    AsyncStorage.removeItem(SETTINGS_STORAGE_KEY),
    clearCustomProviderCredentials(),
  ]);
  return cloneDefaults();
}
