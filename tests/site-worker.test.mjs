import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerUrl = pathToFileURL(path.join(projectRoot, 'dist', 'server', 'index.js'));
workerUrl.searchParams.set('test', `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const env = {
  ASSETS: {
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname).replace(/^\//u, '');
      try {
        const body = await readFile(path.join(projectRoot, 'dist', 'client', pathname));
        return new Response(request.method === 'HEAD' ? null : body, {
          headers: {
            'Content-Type': pathname.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream',
          },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    },
  },
};

test('serves the Expo entry page with secure HTML headers', async () => {
  const response = await worker.fetch(new Request('https://example.test/'), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/iu);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('permissions-policy') ?? '', /local-network=\(self\)/u);
  assert.match(response.headers.get('permissions-policy') ?? '', /loopback-network=\(self\)/u);
  assert.match(
    response.headers.get('permissions-policy') ?? '',
    /on-device-speech-recognition=\(self\)/u,
  );
  assert.match(await response.text(), /<div id="root">/u);
});

test('serves a dynamic Expo route on direct navigation', async () => {
  const response = await worker.fetch(new Request('https://example.test/lesson/incident-basics'), env);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<div id="root">/u);
});

test('dispatches tutor API validation without exposing a secret', async () => {
  const response = await worker.fetch(
    new Request('https://example.test/api/tutor', {
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }),
    env,
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'invalid-messages');
});

test('dispatches both voice API routes', async () => {
  const session = await worker.fetch(
    new Request('https://example.test/api/voice/session', { method: 'POST' }),
    env,
  );
  assert.equal(session.status, 415);

  const transcription = await worker.fetch(
    new Request('https://example.test/api/voice/transcribe', { method: 'POST' }),
    env,
  );
  assert.equal(transcription.status, 415);
});

test('blocks every managed OpenAI route in public-demo mode', async () => {
  const publicEnv = {
    ...env,
    CYBERPATH_PUBLIC_DEMO: 'true',
  };
  const requests = [
    new Request('https://example.test/api/tutor', { method: 'POST' }),
    new Request('https://example.test/api/voice/session', { method: 'POST' }),
    new Request('https://example.test/api/voice/transcribe', { method: 'POST' }),
  ];

  for (const request of requests) {
    const response = await worker.fetch(request, publicEnv);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'public-demo');
  }
});

test('rejects untrusted or ambiguous live-answer routing parameters', async () => {
  const cases = [
    ['https://example.test/api/voice/session?answer=unknown', 'invalid-parameter'],
    [
      'https://example.test/api/voice/session?answer=provider&answer=realtime',
      'invalid-parameter',
    ],
    [
      'https://example.test/api/voice/session?answer=provider&baseUrl=http://127.0.0.1:11434',
      'invalid-parameter',
    ],
    [
      'https://example.test/api/voice/session?answer=provider&apiKey=not-a-real-key',
      'invalid-parameter',
    ],
  ];

  for (const [url, expectedCode] of cases) {
    const response = await worker.fetch(
      new Request(url, {
        body: 'not-needed-for-query-validation',
        headers: { 'Content-Type': 'application/sdp' },
        method: 'POST',
      }),
      env,
    );
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, expectedCode);
  }
});

test('returns the Expo not-found document for unknown pages', async () => {
  const response = await worker.fetch(new Request('https://example.test/does-not-exist'), env);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/iu);
});
