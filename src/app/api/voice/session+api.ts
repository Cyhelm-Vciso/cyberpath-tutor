import { buildRealtimeSessionConfig } from '@/lib/realtime-session-policy';
import { readServerEnv } from '@/lib/server-env';

const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime/calls';
const DEFAULT_REALTIME_MODEL = 'gpt-realtime-2.1';
const DEFAULT_REALTIME_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const DEFAULT_VOICE = 'marin';
const DEFAULT_MODE = 'tutor';
const OPENAI_TIMEOUT_MS = 20_000;
const MAX_SDP_BYTES = 128 * 1024;
const MAX_UPSTREAM_SDP_BYTES = 512 * 1024;
const MAX_PROVIDER_ERROR_BYTES = 64 * 1024;

const ALLOWED_REALTIME_MODELS = new Set(['gpt-realtime-2.1']);
const ALLOWED_REALTIME_TRANSCRIPTION_MODELS = new Set(['gpt-4o-mini-transcribe']);
const ALLOWED_VOICES = new Set(['marin', 'cedar']);
const ALLOWED_MODES = new Set(['tutor', 'interview']);
const ALLOWED_QUERY_PARAMETERS = new Set(['voice', 'mode']);

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable = false,
): Response {
  const body: ApiErrorBody = {
    error: { code, message, retryable },
  };
  return jsonResponse(body, status);
}

async function readBoundedText(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<
  | { ok: true; text: string }
  | { ok: false; reason: 'missing' | 'too-large' | 'unreadable' }
> {
  if (!stream) return { ok: false, reason: 'missing' };

  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: 'too-large' };
      }

      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  return { ok: true, text };
}

function isValidSdpOffer(value: string): boolean {
  if (!value || value.includes('\u0000')) return false;

  const normalized = value.replace(/\r\n/gu, '\n');
  return (
    normalized.startsWith('v=0\n') &&
    /^o=.+$/mu.test(normalized) &&
    /^s=.+$/mu.test(normalized) &&
    /^t=.+$/mu.test(normalized) &&
    /^m=audio\s/imu.test(normalized) &&
    /^a=(ice-ufrag|fingerprint):/imu.test(normalized)
  );
}

function isValidSdpAnswer(value: string): boolean {
  if (!value || value.length > MAX_UPSTREAM_SDP_BYTES || value.includes('\u0000')) {
    return false;
  }

  const normalized = value.replace(/\r\n/gu, '\n');
  return normalized.startsWith('v=0\n') && /^m=audio\s/imu.test(normalized);
}

function getSingleParameter(url: URL, name: string): string | undefined {
  const values = url.searchParams.getAll(name);
  if (values.length > 1) return undefined;
  return values[0]?.trim() || undefined;
}

async function providerErrorResponse(response: Response): Promise<Response> {
  let providerCode: string | undefined;

  try {
    const rawBody = await readBoundedText(response.body, MAX_PROVIDER_ERROR_BYTES);
    if (rawBody.ok) {
      const body = JSON.parse(rawBody.text) as {
        error?: { code?: unknown };
      };
      if (typeof body.error?.code === 'string') providerCode = body.error.code;
    }
  } catch {
    // Do not expose or log provider response bodies.
  }

  if (response.status === 429 && providerCode === 'insufficient_quota') {
    return errorResponse(
      402,
      'quota-exhausted',
      'This OpenAI API project has no available quota or credits.',
    );
  }

  if (response.status === 429) {
    return errorResponse(429, 'rate-limit', 'Voice sessions are rate-limited right now.', true);
  }

  if (response.status === 401) {
    return errorResponse(
      503,
      'provider-authentication',
      'The voice service could not authenticate with OpenAI.',
    );
  }

  if (response.status === 403 || response.status === 404) {
    return errorResponse(
      503,
      'model-unavailable',
      'The configured realtime model is not available to this OpenAI project.',
    );
  }

  if (response.status === 400 || response.status === 422) {
    return errorResponse(
      400,
      'invalid-sdp',
      'OpenAI could not accept this WebRTC session offer.',
    );
  }

  return errorResponse(
    502,
    'provider-error',
    'The realtime voice service is temporarily unavailable.',
    response.status >= 500,
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/sdp') {
    return errorResponse(
      415,
      'unsupported-media-type',
      'Send the WebRTC offer as application/sdp.',
    );
  }

  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SDP_BYTES) {
    return errorResponse(413, 'request-too-large', 'The WebRTC session offer is too large.');
  }

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return errorResponse(400, 'invalid-request', 'The voice session request is invalid.');
  }

  for (const name of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(name)) {
      return errorResponse(400, 'invalid-parameter', `Unsupported query parameter: ${name}.`);
    }
  }

  if (
    url.searchParams.getAll('voice').length > 1 ||
    url.searchParams.getAll('mode').length > 1
  ) {
    return errorResponse(
      400,
      'invalid-parameter',
      'Voice and mode may be provided only once.',
    );
  }

  const voice = getSingleParameter(url, 'voice') || DEFAULT_VOICE;
  if (!ALLOWED_VOICES.has(voice)) {
    return errorResponse(400, 'invalid-voice', 'Choose either the marin or cedar voice.');
  }

  const mode = getSingleParameter(url, 'mode') || DEFAULT_MODE;
  if (!ALLOWED_MODES.has(mode)) {
    return errorResponse(400, 'invalid-mode', 'Choose either tutor or interview mode.');
  }

  const model = readServerEnv('OPENAI_REALTIME_MODEL')?.trim() || DEFAULT_REALTIME_MODEL;
  if (!ALLOWED_REALTIME_MODELS.has(model)) {
    return errorResponse(
      503,
      'server-misconfigured',
      'The configured realtime model is not allowed by this server.',
    );
  }

  const transcriptionModel =
    readServerEnv('OPENAI_REALTIME_TRANSCRIPTION_MODEL')?.trim() ||
    DEFAULT_REALTIME_TRANSCRIPTION_MODEL;
  if (!ALLOWED_REALTIME_TRANSCRIPTION_MODELS.has(transcriptionModel)) {
    return errorResponse(
      503,
      'server-misconfigured',
      'The configured realtime transcription model is not allowed by this server.',
    );
  }

  const apiKey = readServerEnv('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    return errorResponse(
      503,
      'server-not-configured',
      'The built-in voice service is not configured on this server.',
    );
  }

  const offer = await readBoundedText(request.body, MAX_SDP_BYTES);
  if (!offer.ok) {
    if (offer.reason === 'too-large') {
      return errorResponse(413, 'request-too-large', 'The WebRTC session offer is too large.');
    }
    return errorResponse(400, 'invalid-sdp', 'The WebRTC session offer could not be read.');
  }

  if (!isValidSdpOffer(offer.text)) {
    return errorResponse(400, 'invalid-sdp', 'The request does not contain a valid audio SDP offer.');
  }

  const session = buildRealtimeSessionConfig({
    model,
    transcriptionModel,
    voice,
    mode: mode as 'tutor' | 'interview',
  });

  const formData = new FormData();
  formData.set('sdp', offer.text);
  formData.set('session', JSON.stringify(session));

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, OPENAI_TIMEOUT_MS);
  const abortFromClient = () => controller.abort();
  request.signal.addEventListener('abort', abortFromClient, { once: true });

  try {
    const response = await fetch(OPENAI_REALTIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) return providerErrorResponse(response);

    const answer = await readBoundedText(response.body, MAX_UPSTREAM_SDP_BYTES);
    if (!answer.ok || !isValidSdpAnswer(answer.text)) {
      return errorResponse(
        502,
        'invalid-provider-response',
        'OpenAI returned an invalid WebRTC session answer.',
        true,
      );
    }

    return new Response(answer.text, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/sdp',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    if (timedOut) {
      return errorResponse(408, 'timeout', 'OpenAI took too long to start the voice session.', true);
    }

    if (request.signal.aborted) {
      return errorResponse(499, 'request-cancelled', 'The voice session request was cancelled.');
    }

    return errorResponse(
      502,
      'network',
      'The voice service could not reach OpenAI.',
      true,
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abortFromClient);
  }
}
