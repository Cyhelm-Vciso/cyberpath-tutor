import OpenAI, { toFile } from 'openai';

import { readServerEnv } from '@/lib/server-env';

const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';
const OPENAI_TIMEOUT_MS = 60_000;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 256 * 1024;
const MIN_AUDIO_BYTES = 16;

const ALLOWED_TRANSCRIPTION_MODELS = new Set([
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
]);

type AudioFormat = 'mpeg' | 'mp4' | 'wav' | 'webm';

const EXTENSION_FORMATS: Record<string, AudioFormat> = {
  mp3: 'mpeg',
  mpeg: 'mpeg',
  mpga: 'mpeg',
  mp4: 'mp4',
  m4a: 'mp4',
  wav: 'wav',
  webm: 'webm',
};

const MIME_FORMATS: Record<string, AudioFormat> = {
  'audio/mpeg': 'mpeg',
  'audio/mp3': 'mpeg',
  'audio/mpga': 'mpeg',
  'audio/mp4': 'mp4',
  'audio/m4a': 'mp4',
  'audio/x-m4a': 'mp4',
  'video/mp4': 'mp4',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'webm',
  'video/webm': 'webm',
};

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

interface ParsedMultipartFormData {
  keys(): IterableIterator<string>;
  getAll(name: string): (string | Blob)[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function hasValidMultipartBoundary(contentType: string): boolean {
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'multipart/form-data') return false;

  const match = contentType.match(
    /(?:^|;)\s*boundary=(?:"([^"\r\n]+)"|([^;\s\r\n]+))/iu,
  );
  const boundary = match?.[1] || match?.[2];
  return Boolean(boundary && boundary.length <= 200);
}

async function readBoundedBytes(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<
  | { ok: true; bytes: Uint8Array<ArrayBuffer> }
  | { ok: false; reason: 'missing' | 'too-large' | 'unreadable' }
> {
  if (!stream) return { ok: false, reason: 'missing' };

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: 'too-large' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, bytes };
}

function bytesEqual(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function detectAudioFormat(bytes: Uint8Array): AudioFormat | undefined {
  if (bytes.length < MIN_AUDIO_BYTES) return undefined;

  if (
    bytesEqual(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    bytesEqual(bytes, 8, [0x57, 0x41, 0x56, 0x45])
  ) {
    return 'wav';
  }

  if (bytesEqual(bytes, 4, [0x66, 0x74, 0x79, 0x70])) return 'mp4';
  if (bytesEqual(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm';

  if (
    bytesEqual(bytes, 0, [0x49, 0x44, 0x33]) ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  ) {
    return 'mpeg';
  }

  return undefined;
}

function normalizeMimeType(value: string): string {
  return value.split(';', 1)[0].trim().toLowerCase();
}

function getFileName(value: Blob): string {
  if (!('name' in value)) return '';
  const name = (value as Blob & { name?: unknown }).name;
  return typeof name === 'string' ? name.trim() : '';
}

function getExtension(fileName: string): string | undefined {
  return /\.([a-z0-9]+)$/iu.exec(fileName)?.[1].toLowerCase();
}

function uploadExtension(format: AudioFormat, requested?: string): string {
  if (requested && EXTENSION_FORMATS[requested] === format) return requested;
  if (format === 'mpeg') return 'mp3';
  if (format === 'mp4') return 'm4a';
  return format;
}

function uploadMimeType(format: AudioFormat): string {
  if (format === 'mpeg') return 'audio/mpeg';
  if (format === 'mp4') return 'audio/mp4';
  if (format === 'wav') return 'audio/wav';
  return 'audio/webm';
}

function statusFromError(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

function codeFromError(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function openAIErrorResponse(error: unknown): Response {
  const status = statusFromError(error);
  const code = codeFromError(error);

  if (status === 400 || status === 422) {
    return errorResponse(422, 'unreadable-audio', 'OpenAI could not transcribe this audio recording.');
  }

  if (status === 401) {
    return errorResponse(
      503,
      'provider-authentication',
      'The transcription service could not authenticate with OpenAI.',
    );
  }

  if (status === 403 || status === 404) {
    return errorResponse(
      503,
      'model-unavailable',
      'The configured transcription model is not available to this OpenAI project.',
    );
  }

  if (status === 408 || error instanceof OpenAI.APIConnectionTimeoutError) {
    return errorResponse(408, 'timeout', 'OpenAI took too long to transcribe the audio.', true);
  }

  if (status === 429 && code === 'insufficient_quota') {
    return errorResponse(
      402,
      'quota-exhausted',
      'This OpenAI API project has no available quota or credits.',
    );
  }

  if (status === 429) {
    return errorResponse(429, 'rate-limit', 'Transcription is rate-limited right now.', true);
  }

  if ((status && status >= 500) || error instanceof OpenAI.APIConnectionError) {
    return errorResponse(
      502,
      'provider-error',
      'The transcription service is temporarily unavailable.',
      true,
    );
  }

  return errorResponse(
    500,
    'server-error',
    'The transcription service encountered an unexpected error.',
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get('Content-Type') || '';
  if (!hasValidMultipartBoundary(contentType)) {
    return errorResponse(
      415,
      'unsupported-media-type',
      'Send one audio file as multipart/form-data.',
    );
  }

  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, 'request-too-large', 'The audio recording is too large.');
  }

  const requestBody = await readBoundedBytes(request.body, MAX_REQUEST_BYTES);
  if (!requestBody.ok) {
    if (requestBody.reason === 'too-large') {
      return errorResponse(413, 'request-too-large', 'The audio recording is too large.');
    }
    return errorResponse(400, 'invalid-upload', 'The audio upload could not be read.');
  }

  let formData: ParsedMultipartFormData;
  try {
    formData = (await new Response(requestBody.bytes.buffer, {
      headers: { 'Content-Type': contentType },
    }).formData()) as unknown as ParsedMultipartFormData;
  } catch {
    return errorResponse(400, 'invalid-upload', 'The multipart audio upload is invalid.');
  }

  const fields = Array.from(formData.keys());
  const fileEntries = formData.getAll('file');
  if (fields.some((field) => field !== 'file') || fileEntries.length !== 1) {
    return errorResponse(400, 'invalid-upload', 'Send exactly one multipart field named file.');
  }

  const entry = fileEntries[0];
  if (!(entry instanceof Blob)) {
    return errorResponse(400, 'invalid-upload', 'The file field must contain an audio file.');
  }

  if (entry.size < MIN_AUDIO_BYTES) {
    return errorResponse(400, 'empty-audio', 'The audio recording is empty.');
  }

  if (entry.size > MAX_AUDIO_BYTES) {
    return errorResponse(413, 'request-too-large', 'The audio recording is too large.');
  }

  const fileName = getFileName(entry);
  const requestedExtension = getExtension(fileName);
  if (requestedExtension && !EXTENSION_FORMATS[requestedExtension]) {
    return errorResponse(
      415,
      'unsupported-audio',
      'Use an MP3, MP4, M4A, MPEG, MPGA, WAV, or WebM audio file.',
    );
  }

  const declaredMimeType = normalizeMimeType(entry.type);
  if (
    declaredMimeType &&
    declaredMimeType !== 'application/octet-stream' &&
    !MIME_FORMATS[declaredMimeType]
  ) {
    return errorResponse(
      415,
      'unsupported-audio',
      'Use an MP3, MP4, M4A, MPEG, MPGA, WAV, or WebM audio file.',
    );
  }

  const audioBytes = new Uint8Array(await entry.arrayBuffer());
  const detectedFormat = detectAudioFormat(audioBytes);
  if (!detectedFormat) {
    return errorResponse(
      415,
      'unsupported-audio',
      'The uploaded file does not contain a supported audio format.',
    );
  }

  if (
    (requestedExtension && EXTENSION_FORMATS[requestedExtension] !== detectedFormat) ||
    (declaredMimeType &&
      declaredMimeType !== 'application/octet-stream' &&
      MIME_FORMATS[declaredMimeType] !== detectedFormat)
  ) {
    return errorResponse(
      415,
      'audio-type-mismatch',
      'The audio file name, type, and contents do not match.',
    );
  }

  const model = readServerEnv('OPENAI_TRANSCRIPTION_MODEL')?.trim() || DEFAULT_TRANSCRIPTION_MODEL;
  if (!ALLOWED_TRANSCRIPTION_MODELS.has(model)) {
    return errorResponse(
      503,
      'server-misconfigured',
      'The configured transcription model is not allowed by this server.',
    );
  }

  const apiKey = readServerEnv('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    return errorResponse(
      503,
      'server-not-configured',
      'The built-in transcription service is not configured on this server.',
    );
  }

  try {
    const extension = uploadExtension(detectedFormat, requestedExtension);
    const upload = await toFile(audioBytes, `voice-input.${extension}`, {
      type: uploadMimeType(detectedFormat),
    });
    const client = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: OPENAI_TIMEOUT_MS,
    });
    const transcription = await client.audio.transcriptions.create(
      {
        file: upload,
        model,
        response_format: 'json',
      },
      { signal: request.signal },
    );
    const text = transcription.text.trim();

    if (!text) {
      return errorResponse(
        422,
        'no-speech',
        'No clear speech was detected. Try recording again in a quieter place.',
      );
    }

    return jsonResponse({ text, model });
  } catch (error) {
    if (request.signal.aborted) {
      return errorResponse(499, 'request-cancelled', 'The transcription request was cancelled.');
    }
    return openAIErrorResponse(error);
  }
}
