import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundledCatalog = await build({
  bundle: true,
  entryPoints: [path.join(projectRoot, 'src', 'services', 'provider-catalog.ts')],
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  write: false,
});
const catalogUrl = `data:text/javascript;base64,${Buffer.from(
  bundledCatalog.outputFiles[0].contents,
).toString('base64')}`;
const catalog = await import(catalogUrl);

test('includes first-class local AI providers', () => {
  const localIds = catalog.LOCAL_PROVIDER_PRESETS.map((preset) => preset.id);
  assert.deepEqual(localIds, [
    'ollama-local',
    'lm-studio-local',
    'localai-local',
    'llama-cpp-local',
    'vllm-local',
    'jan-local',
    'custom-local',
  ]);
  assert.equal(
    catalog.getProviderPreset('ollama-local').defaultBaseUrl,
    'http://127.0.0.1:11434/v1',
  );
  assert.equal(
    catalog.getProviderPreset('lm-studio-local').defaultApiStyle,
    'chat-completions',
  );
  assert.equal(
    catalog.getProviderPreset('not-a-provider').id,
    'openai-compatible',
  );
});

test('accepts HTTPS without enabling local HTTP', () => {
  assert.equal(
    catalog.normalizeCustomBaseUrl('https://models.example.com/v1/'),
    'https://models.example.com/v1',
  );
});

test('requires an explicit opt-in for local HTTP', () => {
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('http://127.0.0.1:11434/v1'),
    /Allow local HTTP/iu,
  );
  assert.equal(
    catalog.normalizeCustomBaseUrl('http://127.0.0.1:11434/v1', true),
    'http://127.0.0.1:11434/v1',
  );
});

test('allows opted-in private network URLs but rejects public HTTP', () => {
  assert.equal(
    catalog.normalizeCustomBaseUrl('http://192.168.1.20:8000/v1', true),
    'http://192.168.1.20:8000/v1',
  );
  assert.equal(
    catalog.normalizeCustomBaseUrl('http://models.home.arpa:8000/v1', true),
    'http://models.home.arpa:8000/v1',
  );
  assert.equal(
    catalog.normalizeCustomBaseUrl('http://[fc00::1]:8000/v1', true),
    'http://[fc00::1]:8000/v1',
  );
  assert.equal(
    catalog.normalizeCustomBaseUrl('http://[fe80::1]:8000/v1', true),
    'http://[fe80::1]:8000/v1',
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('http://203.0.113.12:8000/v1', true),
    /Use HTTPS for public endpoints/iu,
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('http://fc00.example.com/v1', true),
    /Use HTTPS for public endpoints/iu,
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('http://fe80.example.com/v1', true),
    /Use HTTPS for public endpoints/iu,
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('http://example.lan/v1', true),
    /Use HTTPS for public endpoints/iu,
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('http://0.0.0.0:8000/v1', true),
    /reachable hostname or IP address/iu,
  );
});

test('rejects credentials, query strings, and fragments in provider URLs', () => {
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('https://token@example.com/v1'),
    /Do not put credentials/iu,
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('https://example.com/v1?key=value'),
    /query parameters/iu,
  );
  assert.throws(
    () => catalog.normalizeCustomBaseUrl('https://example.com/v1#models'),
    /fragment/iu,
  );
});

test('builds compatible endpoints without duplicating the selected route', () => {
  assert.equal(
    catalog.buildCustomProviderUrl(
      'http://localhost:11434/v1',
      'chat-completions',
      true,
    ),
    'http://localhost:11434/v1/chat/completions',
  );
  assert.equal(
    catalog.buildCustomProviderUrl(
      'http://localhost:11434/v1/chat/completions',
      'chat-completions',
      true,
    ),
    'http://localhost:11434/v1/chat/completions',
  );
});

test('classifies browser local-network address spaces', () => {
  assert.equal(
    catalog.getCustomProviderAddressSpace('http://localhost:11434/v1'),
    'loopback',
  );
  assert.equal(
    catalog.getCustomProviderAddressSpace('http://10.20.30.40:8000/v1'),
    'local',
  );
  assert.equal(
    catalog.getCustomProviderAddressSpace('https://models.example.com/v1'),
    undefined,
  );
});
