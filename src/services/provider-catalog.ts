export type Provider = 'openai' | 'custom';
export type ApiStyle = 'responses' | 'chat-completions';
export type ProviderPresetCategory = 'local' | 'custom' | 'cloud';
export type ProviderCredentialPolicy =
  | 'local-direct'
  | 'direct-advanced'
  | 'server-gateway';
export type LocalNetworkAddressSpace = 'loopback' | 'local';

export type ProviderPresetId =
  | 'ollama-local'
  | 'lm-studio-local'
  | 'localai-local'
  | 'llama-cpp-local'
  | 'vllm-local'
  | 'jan-local'
  | 'custom-local'
  | 'openai-compatible'
  | 'azure-openai-gateway'
  | 'anthropic-gateway'
  | 'gemini-vertex-gateway'
  | 'bedrock-gateway'
  | 'private-self-hosted';

export interface ProviderPreset {
  id: ProviderPresetId;
  label: string;
  shortLabel: string;
  description: string;
  category: ProviderPresetCategory;
  baseUrlPlaceholder: string;
  modelPlaceholder: string;
  defaultBaseUrl: string;
  defaultModel: string;
  defaultApiStyle: ApiStyle;
  credentialPolicy: ProviderCredentialPolicy;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: 'ollama-local',
    label: 'Ollama',
    shortLabel: 'Ollama',
    description: 'Run installed Ollama models directly on your computer.',
    category: 'local',
    baseUrlPlaceholder: 'http://127.0.0.1:11434/v1',
    modelPlaceholder: 'llama3.2',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3.2',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'lm-studio-local',
    label: 'LM Studio',
    shortLabel: 'LM Studio',
    description: 'Connect to the local server built into LM Studio.',
    category: 'local',
    baseUrlPlaceholder: 'http://127.0.0.1:1234/v1',
    modelPlaceholder: 'Model identifier shown in LM Studio',
    defaultBaseUrl: 'http://127.0.0.1:1234/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'localai-local',
    label: 'LocalAI',
    shortLabel: 'LocalAI',
    description: 'Use a self-hosted LocalAI OpenAI-compatible server.',
    category: 'local',
    baseUrlPlaceholder: 'http://127.0.0.1:8080/v1',
    modelPlaceholder: 'Installed LocalAI model name',
    defaultBaseUrl: 'http://127.0.0.1:8080/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'llama-cpp-local',
    label: 'llama.cpp server',
    shortLabel: 'llama.cpp',
    description: 'Connect to the OpenAI-compatible llama.cpp HTTP server.',
    category: 'local',
    baseUrlPlaceholder: 'http://127.0.0.1:8080/v1',
    modelPlaceholder: 'Model alias exposed by llama-server',
    defaultBaseUrl: 'http://127.0.0.1:8080/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'vllm-local',
    label: 'vLLM server',
    shortLabel: 'vLLM',
    description: 'Use a local or private vLLM OpenAI-compatible server.',
    category: 'local',
    baseUrlPlaceholder: 'http://127.0.0.1:8000/v1',
    modelPlaceholder: 'Served model name',
    defaultBaseUrl: 'http://127.0.0.1:8000/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'jan-local',
    label: 'Jan',
    shortLabel: 'Jan',
    description: 'Connect to the local OpenAI-compatible Jan API server.',
    category: 'local',
    baseUrlPlaceholder: 'http://127.0.0.1:1337/v1',
    modelPlaceholder: 'Model identifier shown in Jan',
    defaultBaseUrl: 'http://127.0.0.1:1337/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'custom-local',
    label: 'Other local AI',
    shortLabel: 'Custom local',
    description: 'Use another compatible server on localhost or your private network.',
    category: 'local',
    baseUrlPlaceholder: 'http://192.168.1.20:8000/v1',
    modelPlaceholder: 'Model name exposed by your server',
    defaultBaseUrl: 'http://192.168.1.20:8000/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'local-direct',
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible custom API',
    shortLabel: 'Compatible API',
    description: 'Connect to an HTTPS endpoint that accepts compatible requests.',
    category: 'custom',
    baseUrlPlaceholder: 'https://api.example.com/v1',
    modelPlaceholder: 'provider-model-name',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.6-luna',
    defaultApiStyle: 'responses',
    credentialPolicy: 'direct-advanced',
  },
  {
    id: 'azure-openai-gateway',
    label: 'Azure / OpenAI gateway',
    shortLabel: 'Azure / OpenAI',
    description: 'Use your organization gateway to normalize Azure OpenAI or OpenAI traffic.',
    category: 'cloud',
    baseUrlPlaceholder: 'https://ai-gateway.company.com/openai/v1',
    modelPlaceholder: 'Gateway model alias',
    defaultBaseUrl: 'https://ai-gateway.company.com/openai/v1',
    defaultModel: '',
    defaultApiStyle: 'responses',
    credentialPolicy: 'server-gateway',
  },
  {
    id: 'anthropic-gateway',
    label: 'Anthropic gateway',
    shortLabel: 'Anthropic',
    description: 'Use a gateway that translates Claude requests to a compatible protocol.',
    category: 'cloud',
    baseUrlPlaceholder: 'https://ai-gateway.company.com/anthropic/v1',
    modelPlaceholder: 'Gateway Claude model alias',
    defaultBaseUrl: 'https://ai-gateway.company.com/anthropic/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'server-gateway',
  },
  {
    id: 'gemini-vertex-gateway',
    label: 'Gemini / Vertex gateway',
    shortLabel: 'Gemini / Vertex',
    description: 'Use a gateway that translates Gemini or Vertex AI requests.',
    category: 'cloud',
    baseUrlPlaceholder: 'https://ai-gateway.company.com/google/v1',
    modelPlaceholder: 'Gateway Gemini model alias',
    defaultBaseUrl: 'https://ai-gateway.company.com/google/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'server-gateway',
  },
  {
    id: 'bedrock-gateway',
    label: 'AWS Bedrock gateway',
    shortLabel: 'AWS Bedrock',
    description: 'Use a gateway that holds AWS credentials and normalizes Bedrock requests.',
    category: 'cloud',
    baseUrlPlaceholder: 'https://ai-gateway.company.com/bedrock/v1',
    modelPlaceholder: 'Gateway Bedrock model alias',
    defaultBaseUrl: 'https://ai-gateway.company.com/bedrock/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'server-gateway',
  },
  {
    id: 'private-self-hosted',
    label: 'Private HTTPS server',
    shortLabel: 'Private HTTPS',
    description: 'Connect to a trusted private model server over HTTPS.',
    category: 'custom',
    baseUrlPlaceholder: 'https://models.company.com/v1',
    modelPlaceholder: 'Private model name',
    defaultBaseUrl: 'https://models.company.com/v1',
    defaultModel: '',
    defaultApiStyle: 'chat-completions',
    credentialPolicy: 'direct-advanced',
  },
] as const;

export const LOCAL_PROVIDER_PRESETS = PROVIDER_PRESETS.filter(
  (preset) => preset.category === 'local',
);

export const REMOTE_PROVIDER_PRESETS = PROVIDER_PRESETS.filter(
  (preset) => preset.category !== 'local',
);

export function isProviderPresetId(value: unknown): value is ProviderPresetId {
  return PROVIDER_PRESETS.some((preset) => preset.id === value);
}

export function getProviderPreset(id: ProviderPresetId): ProviderPreset {
  return (
    PROVIDER_PRESETS.find((preset) => preset.id === id) ??
    PROVIDER_PRESETS.find((preset) => preset.id === 'openai-compatible')!
  );
}

function isApiStyle(value: unknown): value is ApiStyle {
  return value === 'responses' || value === 'chat-completions';
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/gu, '').replace(/\.$/u, '');
}

function parseIpv4(hostname: string): readonly number[] | undefined {
  const parts = hostname.split('.');
  if (
    parts.length !== 4 ||
    parts.some((part) => !/^\d{1,3}$/u.test(part) || Number(part) > 255)
  ) {
    return undefined;
  }

  return parts.map(Number);
}

function classifyIpv4(parts: readonly number[]): LocalNetworkAddressSpace | undefined {
  const [first, second] = parts;
  if (first === 127) return 'loopback';
  if (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    (first === 100 && second >= 64 && second <= 127)
  ) {
    return 'local';
  }

  return undefined;
}

function isUnspecifiedHost(hostname: string): boolean {
  return hostname === '0.0.0.0' || hostname === '::';
}

function classifyHostname(hostname: string): LocalNetworkAddressSpace | undefined {
  const host = normalizeHostname(hostname);
  if (!host || isUnspecifiedHost(host)) return undefined;

  if (host === 'localhost' || host.endsWith('.localhost')) return 'loopback';
  if (host === '::1') return 'loopback';

  const ipv4 = parseIpv4(host);
  if (ipv4) return classifyIpv4(ipv4);

  if (host.startsWith('::ffff:')) {
    const mappedIpv4 = parseIpv4(host.slice('::ffff:'.length));
    if (mappedIpv4) return classifyIpv4(mappedIpv4);
  }

  if (host.includes(':')) {
    const firstIpv6Group = Number.parseInt(host.split(':')[0] || '0', 16);
    if (
      Number.isFinite(firstIpv6Group) &&
      ((firstIpv6Group >= 0xfc00 && firstIpv6Group <= 0xfdff) ||
        (firstIpv6Group >= 0xfe80 && firstIpv6Group <= 0xfebf))
    ) {
      return 'local';
    }
  }

  if (
    host === 'host.docker.internal' ||
    host.endsWith('.local') ||
    host.endsWith('.home.arpa')
  ) {
    return 'local';
  }

  return undefined;
}

export function getCustomProviderAddressSpace(
  value: string,
): LocalNetworkAddressSpace | undefined {
  try {
    return classifyHostname(new URL(value).hostname);
  } catch {
    return undefined;
  }
}

export function normalizeCustomBaseUrl(
  value: string,
  allowLocalHttp = false,
): string {
  const input = value.trim();
  if (!input) {
    throw new Error('Enter a custom provider base URL.');
  }

  if (input.length > 2_048) {
    throw new Error('The custom provider URL is too long.');
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Enter a valid provider URL, including http:// or https://.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The provider URL must use HTTP or HTTPS.');
  }

  if (url.username || url.password) {
    throw new Error('Do not put credentials in the provider URL. Use the API key or headers field.');
  }

  if (url.search || url.hash) {
    throw new Error('The provider base URL cannot contain query parameters or a fragment.');
  }

  const normalizedHost = normalizeHostname(url.hostname);
  if (isUnspecifiedHost(normalizedHost)) {
    throw new Error('Use a reachable hostname or IP address instead of 0.0.0.0.');
  }

  if (url.protocol === 'http:') {
    if (!allowLocalHttp) {
      throw new Error('Turn on “Allow local HTTP” to use an unencrypted local AI URL.');
    }

    if (!classifyHostname(url.hostname)) {
      throw new Error(
        'HTTP is allowed only for localhost or private-network AI servers. Use HTTPS for public endpoints.',
      );
    }
  }

  url.pathname = url.pathname.replace(/\/+$/u, '') || '/';
  return url.toString().replace(/\/$/u, '');
}

export function buildCustomProviderUrl(
  baseUrl: string,
  apiStyle: ApiStyle,
  allowLocalHttp = false,
): string {
  if (!isApiStyle(apiStyle)) {
    throw new Error('Choose either the Responses or Chat Completions API style.');
  }

  const normalizedBaseUrl = normalizeCustomBaseUrl(baseUrl, allowLocalHttp);
  const endpointPath = apiStyle === 'responses' ? 'responses' : 'chat/completions';
  const parsed = new URL(normalizedBaseUrl);
  const normalizedPath = parsed.pathname.replace(/\/+$/u, '').toLowerCase();

  if (normalizedPath.endsWith(`/${endpointPath}`)) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/${endpointPath}`;
}
