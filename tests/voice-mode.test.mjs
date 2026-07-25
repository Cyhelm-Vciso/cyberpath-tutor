import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundledVoiceMode = await build({
  bundle: true,
  entryPoints: [path.join(projectRoot, 'src', 'domain', 'voice-mode.ts')],
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  write: false,
});
const voiceModeUrl = `data:text/javascript;base64,${Buffer.from(
  bundledVoiceMode.outputFiles[0].contents,
).toString('base64')}`;
const { resolveLiveVoiceTransport, resolveVoiceEngine } = await import(voiceModeUrl);

test('keeps custom-provider live voice off the OpenAI transport', () => {
  assert.equal(resolveLiveVoiceTransport('custom'), 'local-device');
  assert.equal(resolveLiveVoiceTransport('openai'), 'openai-realtime');
});

test('keeps the existing automatic behavior for built-in and custom providers', () => {
  assert.equal(
    resolveVoiceEngine({
      preference: 'auto',
      realtimeSupported: true,
      platform: 'web',
      defaultToRealtime: true,
    }),
    'realtime',
  );
  assert.equal(
    resolveVoiceEngine({
      preference: 'auto',
      realtimeSupported: true,
      platform: 'web',
      defaultToRealtime: false,
    }),
    'turn-based',
  );
});

test('allows an explicit live conversation while a custom provider is selected', () => {
  assert.equal(
    resolveVoiceEngine({
      preference: 'realtime',
      realtimeSupported: true,
      platform: 'web',
      defaultToRealtime: false,
    }),
    'realtime',
  );
});

test('honors an explicit provider voice-turn choice', () => {
  assert.equal(
    resolveVoiceEngine({
      preference: 'turn-based',
      realtimeSupported: true,
      platform: 'web',
      defaultToRealtime: true,
    }),
    'turn-based',
  );
});

test('preserves an explicit web live selection so an unavailable service fails closed', () => {
  assert.equal(
    resolveVoiceEngine({
      preference: 'realtime',
      realtimeSupported: false,
      platform: 'web',
      defaultToRealtime: true,
    }),
    'realtime',
  );
});

test('falls back safely outside the web app', () => {
  assert.equal(
    resolveVoiceEngine({
      preference: 'realtime',
      realtimeSupported: true,
      platform: 'native',
      defaultToRealtime: true,
    }),
    'turn-based',
  );
});
