import OpenAI from 'openai';

import {
  buildTutorInstructions,
  normalizeTutorMessages,
  type TutorContext,
} from '@/lib/tutor-prompt';
import { readServerEnv } from '@/lib/server-env';

const DEFAULT_OPENAI_TUTOR_MODEL = 'gpt-5.6-luna';
const OPENAI_TIMEOUT_MS = 110_000;
const MAX_REQUEST_BODY_BYTES = 400_000;

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
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

async function readRequestJson(request: Request): Promise<
  | { ok: true; body: unknown }
  | { ok: false; response: Response }
> {
  if (!request.body) {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-json', 'The request body must be valid JSON.'),
    };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          response: errorResponse(413, 'request-too-large', 'The tutor request is too large.'),
        };
      }

      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-json', 'The request body could not be read.'),
    };
  }

  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'invalid-json', 'The request body must be valid JSON.'),
    };
  }
}

function statusFromError(error: unknown): number | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.status === 'number' ? error.status : undefined;
}

function codeFromError(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function openAIErrorResponse(error: unknown): Response {
  const status = statusFromError(error);
  const code = codeFromError(error);

  if (status === 400 || status === 422) {
    return errorResponse(
      status,
      'invalid-request',
      'OpenAI could not process this tutor request.',
    );
  }

  if (status === 401) {
    return errorResponse(
      401,
      'authentication',
      'The tutor server could not authenticate with OpenAI.',
    );
  }

  if (status === 403) {
    return errorResponse(
      403,
      'access-denied',
      'This OpenAI project does not have access to the configured tutor model.',
    );
  }

  if (status === 404) {
    return errorResponse(
      404,
      'not-found',
      'The configured OpenAI tutor model is not available to this project.',
    );
  }

  if (status === 408 || error instanceof OpenAI.APIConnectionTimeoutError) {
    return errorResponse(408, 'timeout', 'OpenAI took too long to respond.', true);
  }

  if (status === 429 && code === 'insufficient_quota') {
    return errorResponse(
      402,
      'quota-exhausted',
      'This OpenAI API project has no available quota or credits.',
    );
  }

  if (status === 429) {
    return errorResponse(429, 'rate-limit', 'OpenAI is rate-limited right now.', true);
  }

  if (status && status >= 500) {
    return errorResponse(502, 'provider-error', 'OpenAI is temporarily unavailable.', true);
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return errorResponse(502, 'network', 'The tutor server could not reach OpenAI.', true);
  }

  return errorResponse(500, 'server-error', 'The tutor server encountered an unexpected error.');
}

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return errorResponse(413, 'request-too-large', 'The tutor request is too large.');
  }

  const parsedRequest = await readRequestJson(request);
  if (!parsedRequest.ok) return parsedRequest.response;
  const body = parsedRequest.body;

  if (!isRecord(body)) {
    return errorResponse(400, 'invalid-request', 'The request body must be a JSON object.');
  }

  let messages;
  try {
    messages = normalizeTutorMessages(body.messages);
  } catch (error) {
    return errorResponse(
      400,
      'invalid-messages',
      error instanceof Error ? error.message : 'The conversation is not valid.',
    );
  }

  if (body.context !== undefined && !isRecord(body.context)) {
    return errorResponse(400, 'invalid-context', 'Tutor context must be a JSON object.');
  }

  const apiKey = readServerEnv('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    return errorResponse(
      503,
      'server-not-configured',
      'The built-in tutor is not configured on this server.',
    );
  }

  const client = new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: OPENAI_TIMEOUT_MS,
  });
  const model = readServerEnv('OPENAI_MODEL')?.trim() || DEFAULT_OPENAI_TUTOR_MODEL;

  try {
    const response = await client.responses.create(
      {
        model,
        instructions: buildTutorInstructions(body.context as TutorContext | undefined),
        input: messages.map(({ role, content }) => ({ role, content })),
        max_output_tokens: 2_400,
        store: false,
      },
      { signal: request.signal },
    );
    const text = response.output_text.trim();

    if (response.status === 'incomplete') {
      return errorResponse(
        502,
        'incomplete-response',
        'OpenAI stopped before the tutor response was complete.',
        true,
      );
    }

    if (!text) {
      return errorResponse(
        502,
        'empty-response',
        'OpenAI returned no readable tutor response.',
        true,
      );
    }

    return jsonResponse({
      text,
      model: response.model || model,
      responseId: response.id,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    });
  } catch (error) {
    return openAIErrorResponse(error);
  }
}
