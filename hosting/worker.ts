import * as tutorRoute from '@/app/api/tutor+api';
import * as voiceSessionRoute from '@/app/api/voice/session+api';
import * as voiceTranscribeRoute from '@/app/api/voice/transcribe+api';

interface AssetBinding {
  fetch(request: Request): Promise<Response>;
}

interface Environment {
  ASSETS: AssetBinding;
  [key: string]: unknown;
}

interface HtmlRoute {
  asset: string;
  pattern: string;
}

interface RouteModule {
  DELETE?: (request: Request) => Response | Promise<Response>;
  GET?: (request: Request) => Response | Promise<Response>;
  HEAD?: (request: Request) => Response | Promise<Response>;
  OPTIONS?: (request: Request) => Response | Promise<Response>;
  PATCH?: (request: Request) => Response | Promise<Response>;
  POST?: (request: Request) => Response | Promise<Response>;
  PUT?: (request: Request) => Response | Promise<Response>;
}

declare const __CYBERPATH_HTML_ROUTES__: readonly HtmlRoute[];

const API_ROUTES = new Map<string, RouteModule>([
  ['/api/tutor', tutorRoute],
  ['/api/voice/session', voiceSessionRoute],
  ['/api/voice/transcribe', voiceTranscribeRoute],
]);

const HTML_ROUTES = __CYBERPATH_HTML_ROUTES__.map((route) => ({
  ...route,
  regex: new RegExp(route.pattern),
}));

const SECURITY_HEADERS = {
  'Permissions-Policy':
    'camera=(), geolocation=(), local-network=(self), loopback-network=(self), microphone=(self), on-device-speech-recognition=(self)',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const;

function bindServerEnvironment(env: Environment): void {
  globalThis.__CYBERPATH_SERVER_ENV__ = env;
}

function managedOpenAIDisabled(env: Environment): boolean {
  return env.CYBERPATH_PUBLIC_DEMO === 'true';
}

function withHeaders(response: Response, html = false, status = response.status): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (html) headers.set('Cache-Control', 'no-store');

  return new Response(response.body, {
    headers,
    status,
    statusText: response.statusText,
  });
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message, retryable: status >= 500 } },
    {
      status,
      headers: {
        ...SECURITY_HEADERS,
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  );
}

function normalizedPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function requestForAsset(request: Request, pathname: string): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

async function handleApi(request: Request, route: RouteModule): Promise<Response> {
  const method = request.method.toUpperCase() as keyof RouteModule;
  const handler = route[method];
  if (!handler) {
    const response = jsonError(405, 'method-not-allowed', 'This endpoint does not support that method.');
    response.headers.set('Allow', 'POST');
    return response;
  }

  try {
    return withHeaders(await handler(request));
  } catch {
    return jsonError(500, 'server-error', 'The tutor service encountered an unexpected error.');
  }
}

async function serveHtml(
  request: Request,
  env: Environment,
  asset: string,
  status = 200,
): Promise<Response | null> {
  const response = await env.ASSETS.fetch(requestForAsset(request, `/${asset}`));
  if (response.status === 404) return null;
  return withHeaders(response, true, status);
}

async function handleRequest(request: Request, env: Environment): Promise<Response> {
  bindServerEnvironment(env);

  const url = new URL(request.url);
  const pathname = normalizedPath(url.pathname);
  const apiRoute = API_ROUTES.get(pathname);
  if (apiRoute) {
    if (managedOpenAIDisabled(env)) {
      return jsonError(
        503,
        'public-demo',
        'Built-in OpenAI is disabled on this public site. Connect a local model or your own compatible AI endpoint in AI provider settings.',
      );
    }
    return handleApi(request, apiRoute);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonError(405, 'method-not-allowed', 'This route supports only GET and HEAD requests.');
  }

  const htmlRoute = HTML_ROUTES.find((route) => route.regex.test(pathname));
  if (htmlRoute) {
    const response = await serveHtml(request, env, htmlRoute.asset);
    if (response) return response;
  }

  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) return withHeaders(assetResponse);

  const notFound = await serveHtml(request, env, '+not-found.html', 404);
  return notFound ?? withHeaders(assetResponse);
}

export default {
  fetch(request: Request, env: Environment): Promise<Response> {
    return handleRequest(request, env);
  },
};
