import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function storedOpenAIChoice() {
  return JSON.stringify({
    version: 3,
    provider: 'openai',
    custom: {
      preset: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      allowLocalHttp: false,
      model: 'gpt-5.6-luna',
      apiStyle: 'responses',
    },
  });
}

async function importProviderSettings({
  publicDemo,
  storedValue = null,
}) {
  const storage = {
    value: storedValue,
    writes: [],
    removals: 0,
  };
  globalThis.__PUBLIC_DEMO_PROVIDER_STORAGE__ = storage;

  const [providerSettingsSource, providerCatalogSource] = await Promise.all([
    readFile(
      path.join(projectRoot, 'src', 'services', 'provider-settings.ts'),
      'utf8',
    ),
    readFile(
      path.join(projectRoot, 'src', 'services', 'provider-catalog.ts'),
      'utf8',
    ),
  ]);
  const bundled = await build({
    bundle: true,
    define: {
      'process.env.EXPO_PUBLIC_PUBLIC_DEMO': JSON.stringify(
        publicDemo ? 'true' : 'false',
      ),
    },
    format: 'esm',
    platform: 'neutral',
    plugins: [
      {
        name: 'provider-settings-native-stubs',
        setup(builder) {
          builder.onResolve(
            { filter: /^@\/services\/provider-catalog$/ },
            () => ({
              namespace: 'provider-test-source',
              path: 'provider-catalog',
            }),
          );
          builder.onResolve(
            { filter: /^@react-native-async-storage\/async-storage$/ },
            () => ({
              namespace: 'provider-test-stub',
              path: 'async-storage',
            }),
          );
          builder.onResolve(
            { filter: /^expo-secure-store$/ },
            () => ({
              namespace: 'provider-test-stub',
              path: 'secure-store',
            }),
          );
          builder.onResolve(
            { filter: /^react-native$/ },
            () => ({
              namespace: 'provider-test-stub',
              path: 'react-native',
            }),
          );
          builder.onLoad(
            {
              filter: /^provider-catalog$/,
              namespace: 'provider-test-source',
            },
            () => ({
              contents: providerCatalogSource,
              loader: 'ts',
            }),
          );
          builder.onLoad(
            {
              filter: /^async-storage$/,
              namespace: 'provider-test-stub',
            },
            () => ({
              contents: `
                const storage = globalThis.__PUBLIC_DEMO_PROVIDER_STORAGE__;
                export default {
                  async getItem() {
                    return storage.value;
                  },
                  async setItem(_key, value) {
                    storage.value = value;
                    storage.writes.push(value);
                  },
                  async removeItem() {
                    storage.value = null;
                    storage.removals += 1;
                  },
                };
              `,
              loader: 'js',
            }),
          );
          builder.onLoad(
            {
              filter: /^secure-store$/,
              namespace: 'provider-test-stub',
            },
            () => ({
              contents: `
                export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'device-only';
                export async function isAvailableAsync() { return true; }
                export async function getItemAsync() { return null; }
                export async function setItemAsync() {}
                export async function deleteItemAsync() {}
              `,
              loader: 'js',
            }),
          );
          builder.onLoad(
            {
              filter: /^react-native$/,
              namespace: 'provider-test-stub',
            },
            () => ({
              contents: `export const Platform = { OS: 'web' };`,
              loader: 'js',
            }),
          );
        },
      },
    ],
    stdin: {
      contents: providerSettingsSource,
      loader: 'ts',
      sourcefile: 'provider-settings.ts',
    },
    target: 'es2022',
    write: false,
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    bundled.outputFiles[0].contents,
  ).toString('base64')}#${publicDemo ? 'demo' : 'private'}-${Date.now()}`;

  return {
    providerSettings: await import(moduleUrl),
    storage,
  };
}

test('public demo defaults to local AI and rejects built-in OpenAI persistence', async () => {
  const { providerSettings, storage } = await importProviderSettings({
    publicDemo: true,
    storedValue: storedOpenAIChoice(),
  });

  assert.equal(providerSettings.IS_PUBLIC_DEMO, true);
  assert.equal(providerSettings.BUILT_IN_OPENAI_AVAILABLE, false);
  assert.equal(providerSettings.DEFAULT_PROVIDER_SETTINGS.provider, 'custom');
  assert.equal(
    providerSettings.DEFAULT_PROVIDER_SETTINGS.custom.preset,
    'ollama-local',
  );
  assert.equal(
    providerSettings.DEFAULT_PROVIDER_SETTINGS.custom.allowLocalHttp,
    false,
  );

  const resolved = await providerSettings.getProviderSettings();
  assert.equal(resolved.provider, 'custom');
  assert.equal(resolved.custom.preset, 'ollama-local');
  assert.equal(resolved.custom.apiKey, '');
  assert.equal(storage.value, null);
  assert.equal(storage.removals, 1);

  await assert.rejects(
    () => providerSettings.saveProviderSettings({ provider: 'openai' }),
    /unavailable in this public demo/iu,
  );
  assert.equal(storage.value, null);

  const saved = await providerSettings.saveProviderSettings({
    provider: 'custom',
    custom: {
      ...resolved.custom,
      allowLocalHttp: true,
    },
  });
  assert.equal(saved.provider, 'custom');
  assert.equal(saved.custom.preset, 'ollama-local');
  assert.equal(JSON.parse(storage.value).provider, 'custom');
});

test('private builds retain the existing built-in OpenAI behavior', async () => {
  const { providerSettings, storage } = await importProviderSettings({
    publicDemo: false,
  });

  assert.equal(providerSettings.IS_PUBLIC_DEMO, false);
  assert.equal(providerSettings.BUILT_IN_OPENAI_AVAILABLE, true);
  assert.equal(providerSettings.DEFAULT_PROVIDER_SETTINGS.provider, 'openai');
  assert.equal((await providerSettings.getProviderSettings()).provider, 'openai');

  const saved = await providerSettings.saveProviderSettings({
    provider: 'openai',
  });
  assert.equal(saved.provider, 'openai');
  assert.equal(JSON.parse(storage.value).provider, 'openai');

  const reset = await providerSettings.resetProviderSettings();
  assert.equal(reset.provider, 'openai');
});

test('provider screen visibly disables built-in OpenAI in public demo mode', async () => {
  const source = await readFile(
    path.join(projectRoot, 'src', 'app', 'provider-settings.tsx'),
    'utf8',
  );

  assert.match(source, /disabled=\{IS_PUBLIC_DEMO\}/u);
  assert.match(source, /Unavailable in public demo/u);
  assert.match(source, /Public demo mode/u);
  assert.match(source, /Local AI and custom or cloud providers remain available/u);
});
