import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  buildTutorInstructions,
  normalizeTutorMessages,
  type TutorContext,
  type TutorMessage,
} from '@/lib/tutor-prompt';
import {
  buildCustomProviderUrl,
  getCustomProviderAddressSpace,
  getProviderSettings,
  parseCustomHeaders,
  validateCustomProviderSettings,
  type ApiStyle,
  type LocalNetworkAddressSpace,
  type Provider,
  type ProviderSettings,
} from '@/services/provider-settings';
import {
  redactSensitiveValues,
  sanitizeProviderOutput,
} from '@/services/provider-output-policy';

export type TutorErrorCode =
  | 'invalid-request'
  | 'configuration'
  | 'authentication'
  | 'access-denied'
  | 'not-found'
  | 'quota-exhausted'
  | 'rate-limit'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'provider-error'
  | 'invalid-response';

export interface TutorUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface TutorResult {
  text: string;
  provider: Provider;
  model: string;
  apiStyle: ApiStyle;
  responseId?: string;
  usage?: TutorUsage;
}

export interface TutorRequest {
  messages: readonly TutorMessage[];
  context?: TutorContext;
  settings?: ProviderSettings;
  signal?: AbortSignal;
}

export interface TutorRequestOptions {
  settings?: ProviderSettings;
  signal?: AbortSignal;
}

interface ErrorPayload {
  error?: unknown;
  message?: unknown;
  detail?: unknown;
}

const TUTOR_API_PATH = '/api/tutor';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RESPONSE_BODY_LENGTH = 1_000_000;

export class TutorError extends Error {
  readonly code: TutorErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly provider: Provider;

  constructor(
    message: string,
    options: {
      code: TutorErrorCode;
      provider: Provider;
      status?: number;
      retryable?: boolean;
    },
  ) {
    super(message);
    this.name = 'TutorError';
    this.code = options.code;
    this.provider = options.provider;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function withTutorApiPath(value: string, allowDevelopmentHttp: boolean): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new TutorError('EXPO_PUBLIC_API_URL must be a valid absolute URL.', {
      code: 'configuration',
      provider: 'openai',
    });
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new TutorError('EXPO_PUBLIC_API_URL cannot contain credentials, a query, or a fragment.', {
      code: 'configuration',
      provider: 'openai',
    });
  }

  if (url.protocol !== 'https:' && !(allowDevelopmentHttp && url.protocol === 'http:')) {
    throw new TutorError('The built-in tutor server must use HTTPS outside development.', {
      code: 'configuration',
      provider: 'openai',
    });
  }

  const pathname = url.pathname.replace(/\/+$/u, '');
  const lowerPathname = pathname.toLowerCase();
  url.pathname = lowerPathname.endsWith(TUTOR_API_PATH)
    ? pathname
    : lowerPathname.endsWith('/api')
      ? `${pathname}/tutor`
      : `${pathname}${TUTOR_API_PATH}`;
  return url.toString();
}

function getBuiltInTutorUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return withTutorApiPath(configuredUrl, isDevelopmentBuild());
  }

  if (Platform.OS === 'web') {
    return TUTOR_API_PATH;
  }

  if (isDevelopmentBuild()) {
    const hostUri = Constants.expoConfig?.hostUri?.trim();
    if (hostUri) {
      const developmentOrigin = /^https?:\/\//iu.test(hostUri)
        ? hostUri
        : /^exps?:\/\//iu.test(hostUri)
          ? hostUri.replace(/^exps:/iu, 'https:').replace(/^exp:/iu, 'http:')
          : `http://${hostUri}`;
      try {
        const hostUrl = new URL(developmentOrigin);
        return new URL(TUTOR_API_PATH, hostUrl.origin).toString();
      } catch {
        throw new TutorError('Expo reported an invalid development server address.', {
          code: 'configuration',
          provider: 'openai',
        });
      }
    }
  }

  throw new TutorError(
    'The native tutor server URL is not configured. Set EXPO_PUBLIC_API_URL to the deployed app server.',
    { code: 'configuration', provider: 'openai' },
  );
}

function redactSecrets(message: string, secrets: readonly string[]): string {
  return redactSensitiveValues(message, secrets)
    .replace(/[\u0000-\u001F\u007F]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 500);
}

function extractErrorMessage(payload: unknown, secrets: readonly string[]): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const body = payload as ErrorPayload;
  let candidate: unknown;

  if (typeof body.error === 'string') {
    candidate = body.error;
  } else if (isRecord(body.error)) {
    candidate = body.error.message ?? body.error.detail;
  }

  candidate ??= body.message ?? body.detail;
  return typeof candidate === 'string' ? redactSecrets(candidate, secrets) : undefined;
}

function httpError(
  status: number,
  payload: unknown,
  provider: Provider,
  secrets: readonly string[],
): TutorError {
  const detail = extractErrorMessage(payload, secrets);
  const providerLabel = provider === 'openai' ? 'OpenAI' : 'The custom provider';

  if (status === 400 || status === 422) {
    return new TutorError(detail || `${providerLabel} could not process this tutor request.`, {
      code: 'invalid-request',
      provider,
      status,
    });
  }

  if (status === 401) {
    return new TutorError(
      provider === 'custom'
        ? 'The custom provider rejected its API key or authorization headers.'
        : 'The tutor server could not authenticate with OpenAI.',
      { code: 'authentication', provider, status },
    );
  }

  if (status === 403) {
    return new TutorError(
      provider === 'custom'
        ? 'The custom provider denied access. Check the key, headers, and model permissions.'
        : 'This OpenAI project does not have access to the configured tutor model.',
      { code: 'access-denied', provider, status },
    );
  }

  if (status === 404) {
    return new TutorError(
      provider === 'custom'
        ? 'The custom endpoint or model was not found. Check the base URL, API style, and model.'
        : 'The configured tutor model is not available to this OpenAI project.',
      { code: 'not-found', provider, status },
    );
  }

  if (status === 408 || status === 504) {
    return new TutorError(`${providerLabel} timed out. Try again.`, {
      code: 'timeout',
      provider,
      status,
      retryable: true,
    });
  }

  if (status === 402) {
    return new TutorError(detail || `${providerLabel} has no available API quota or credits.`, {
      code: 'quota-exhausted',
      provider,
      status,
    });
  }

  if (status === 429) {
    return new TutorError(`${providerLabel} is rate-limited right now. Wait briefly and try again.`, {
      code: 'rate-limit',
      provider,
      status,
      retryable: true,
    });
  }

  return new TutorError(
    status >= 500
      ? `${providerLabel} is temporarily unavailable. Try again.`
      : detail || `${providerLabel} returned an unexpected error.`,
    {
      code: 'provider-error',
      provider,
      status,
      retryable: status >= 500,
    },
  );
}

async function readJsonResponse(response: Response, provider: Provider): Promise<unknown> {
  const declaredLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BODY_LENGTH) {
    throw new TutorError('The provider returned an unexpectedly large response.', {
      code: 'invalid-response',
      provider,
    });
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BODY_LENGTH) {
        await reader.cancel();
        throw new TutorError('The provider returned an unexpectedly large response.', {
          code: 'invalid-response',
          provider,
        });
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  }

  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    if (response.ok) {
      throw new TutorError('The provider returned a response that was not valid JSON.', {
        code: 'invalid-response',
        provider,
      });
    }
    return null;
  }
}

function createRequestController(externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    wasTimedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

async function postJson(
  url: string,
  body: unknown,
  headers: Headers,
  provider: Provider,
  secrets: readonly string[],
  externalSignal?: AbortSignal,
  targetAddressSpace?: LocalNetworkAddressSpace,
): Promise<unknown> {
  const requestController = createRequestController(externalSignal);
  let serializedBody: string;

  try {
    serializedBody = JSON.stringify(body);
  } catch {
    requestController.cleanup();
    throw new TutorError('The tutor request contains context that cannot be sent as JSON.', {
      code: 'invalid-request',
      provider,
    });
  }

  try {
    const requestInit: RequestInit & {
      targetAddressSpace?: LocalNetworkAddressSpace;
    } = {
      method: 'POST',
      headers,
      body: serializedBody,
      signal: requestController.signal,
      redirect: 'error',
      credentials: provider === 'custom' ? 'omit' : 'same-origin',
    };
    if (Platform.OS === 'web' && targetAddressSpace) {
      requestInit.targetAddressSpace = targetAddressSpace;
    }

    const response = await fetch(url, requestInit);
    const payload = await readJsonResponse(response, provider);

    if (!response.ok) {
      throw httpError(response.status, payload, provider, secrets);
    }

    return payload;
  } catch (error) {
    if (error instanceof TutorError) {
      throw error;
    }

    if (requestController.signal.aborted) {
      if (requestController.wasTimedOut()) {
        throw new TutorError('The tutor request timed out. Try again.', {
          code: 'timeout',
          provider,
          retryable: true,
        });
      }

      throw new TutorError('The tutor request was canceled.', {
        code: 'aborted',
        provider,
      });
    }

    throw new TutorError(
      provider === 'custom'
        ? targetAddressSpace
          ? 'Could not reach the local AI server. Confirm it is running, allows browser CORS, and that local-network permission was granted.'
          : 'Could not reach the custom provider. Check its URL, your network, and its web CORS settings.'
        : 'Could not reach the tutor server. Check your connection and try again.',
      { code: 'network', provider, retryable: true },
    );
  } finally {
    requestController.cleanup();
  }
}

function extractTextContent(content: unknown): string[] {
  if (typeof content === 'string' && content.trim()) {
    return [content.trim()];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content.flatMap((part) => {
    if (!isRecord(part)) {
      return [];
    }

    const text = readString(part.text) ?? readString(part.refusal);
    return text ? [text] : [];
  });
}

function extractResponsesText(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const outputText = readString(payload.output_text);
  if (outputText) {
    return outputText;
  }

  if (Array.isArray(payload.output)) {
    const parts = payload.output.flatMap((item) =>
      isRecord(item) ? extractTextContent(item.content) : [],
    );
    const text = parts.join('\n\n').trim();
    if (text) {
      return text;
    }
  }

  return readString(payload.text);
}

function extractChatCompletionsText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return undefined;
  }

  for (const choice of payload.choices) {
    if (!isRecord(choice) || !isRecord(choice.message)) {
      continue;
    }

    const parts = extractTextContent(choice.message.content);
    const refusal = readString(choice.message.refusal);
    const text = [...parts, ...(refusal ? [refusal] : [])].join('\n\n').trim();
    if (text) {
      return text;
    }
  }

  return undefined;
}

function extractUsage(payload: unknown, apiStyle: ApiStyle): TutorUsage | undefined {
  if (!isRecord(payload) || !isRecord(payload.usage)) {
    return undefined;
  }

  const usage = payload.usage;
  const inputTokens = readFiniteNumber(
    apiStyle === 'responses' ? usage.input_tokens : usage.prompt_tokens,
  );
  const outputTokens = readFiniteNumber(
    apiStyle === 'responses' ? usage.output_tokens : usage.completion_tokens,
  );
  const totalTokens = readFiniteNumber(usage.total_tokens);

  return inputTokens === undefined && outputTokens === undefined && totalTokens === undefined
    ? undefined
    : { inputTokens, outputTokens, totalTokens };
}

function resultFromPayload(
  payload: unknown,
  provider: Provider,
  fallbackModel: string,
  apiStyle: ApiStyle,
): TutorResult {
  if (apiStyle === 'responses' && isRecord(payload) && payload.status === 'incomplete') {
    throw new TutorError('The provider stopped before the tutor response was complete. Try again.', {
      code: 'invalid-response',
      provider,
      retryable: true,
    });
  }

  const text =
    apiStyle === 'responses'
      ? extractResponsesText(payload)
      : extractChatCompletionsText(payload);

  if (!text) {
    throw new TutorError('The provider returned no readable tutor response.', {
      code: 'invalid-response',
      provider,
    });
  }

  return {
    text,
    provider,
    // Custom-provider metadata is untrusted and may reflect credentials or private
    // URLs. Report only the model that the learner explicitly configured.
    model: fallbackModel,
    apiStyle,
    usage: extractUsage(payload, apiStyle),
  };
}

async function requestBuiltInTutor(
  messages: TutorMessage[],
  context: TutorContext | undefined,
  signal: AbortSignal | undefined,
): Promise<TutorResult> {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const payload = await postJson(
    getBuiltInTutorUrl(),
    { messages, context },
    headers,
    'openai',
    [],
    signal,
  );

  if (!isRecord(payload) || !readString(payload.text)) {
    throw new TutorError('The tutor server returned an invalid response.', {
      code: 'invalid-response',
      provider: 'openai',
    });
  }

  return {
    text: readString(payload.text)!,
    provider: 'openai',
    model: readString(payload.model) ?? 'gpt-5.6-luna',
    apiStyle: 'responses',
    responseId: readString(payload.responseId),
    usage: isRecord(payload.usage)
      ? {
          inputTokens: readFiniteNumber(payload.usage.inputTokens),
          outputTokens: readFiniteNumber(payload.usage.outputTokens),
          totalTokens: readFiniteNumber(payload.usage.totalTokens),
        }
      : undefined,
  };
}

async function requestCustomTutor(
  settings: ProviderSettings,
  messages: TutorMessage[],
  context: TutorContext | undefined,
  signal: AbortSignal | undefined,
): Promise<TutorResult> {
  const custom = validateCustomProviderSettings(settings.custom);
  const extraHeaders = parseCustomHeaders(custom.headersJson);
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });

  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }

  if (custom.apiKey && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${custom.apiKey}`);
  }

  const instructions = buildTutorInstructions(context);
  const body =
    custom.apiStyle === 'responses'
      ? {
          model: custom.model,
          instructions,
          input: messages.map(({ role, content }) => ({ role, content })),
        }
      : {
          model: custom.model,
          messages: [
            { role: 'system', content: instructions },
            ...messages.map(({ role, content }) => ({ role, content })),
          ],
        };

  const endpointUrl = buildCustomProviderUrl(
    custom.baseUrl,
    custom.apiStyle,
    custom.allowLocalHttp,
  );
  // Prevent a malicious or misconfigured provider from reflecting credentials or
  // its private endpoint into app-visible output or managed speech.
  const headerValues = Object.values(extraHeaders);
  const bearerTokens = headerValues
    .map((value) => value.match(/^Bearer\s+(.+)$/iu)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
  const secrets = [
    custom.apiKey,
    ...headerValues,
    ...bearerTokens,
    custom.baseUrl,
    endpointUrl,
    new URL(endpointUrl).origin,
  ].filter(Boolean);
  const payload = await postJson(
    endpointUrl,
    body,
    headers,
    'custom',
    secrets,
    signal,
    getCustomProviderAddressSpace(endpointUrl),
  );

  const result = resultFromPayload(payload, 'custom', custom.model, custom.apiStyle);
  const text = sanitizeProviderOutput(result.text, secrets);
  if (!text) {
    throw new TutorError('The provider returned no safe tutor response.', {
      code: 'invalid-response',
      provider: 'custom',
    });
  }

  return { ...result, text };
}

export function sendTutorMessage(request: TutorRequest): Promise<TutorResult>;
export function sendTutorMessage(
  messages: readonly TutorMessage[],
  context?: TutorContext,
  options?: TutorRequestOptions,
): Promise<TutorResult>;
export async function sendTutorMessage(
  requestOrMessages: TutorRequest | readonly TutorMessage[],
  context?: TutorContext,
  options: TutorRequestOptions = {},
): Promise<TutorResult> {
  const request: TutorRequest = Array.isArray(requestOrMessages)
    ? { messages: requestOrMessages, context, ...options }
    : (requestOrMessages as TutorRequest);

  let messages: TutorMessage[];
  try {
    messages = normalizeTutorMessages(request.messages);
  } catch (error) {
    throw new TutorError(
      error instanceof Error ? error.message : 'The tutor request is not valid.',
      { code: 'invalid-request', provider: request.settings?.provider ?? 'openai' },
    );
  }

  let settings: ProviderSettings;
  try {
    settings = request.settings ?? (await getProviderSettings());
  } catch {
    throw new TutorError('Could not load the provider settings on this device.', {
      code: 'configuration',
      provider: 'openai',
    });
  }

  if (settings.provider === 'custom') {
    try {
      return await requestCustomTutor(settings, messages, request.context, request.signal);
    } catch (error) {
      if (error instanceof TutorError) {
        throw error;
      }

      throw new TutorError(
        error instanceof Error ? error.message : 'The custom provider settings are not valid.',
        { code: 'configuration', provider: 'custom' },
      );
    }
  }

  return requestBuiltInTutor(messages, request.context, request.signal);
}

export type { TutorContext, TutorMessage } from '@/lib/tutor-prompt';
