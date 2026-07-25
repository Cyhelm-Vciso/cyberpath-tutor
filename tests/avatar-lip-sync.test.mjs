import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import pngjs from 'pngjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PNG } = pngjs;

async function importBundled(entryPath) {
  const bundled = await build({
    bundle: true,
    entryPoints: [path.join(projectRoot, entryPath)],
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    write: false,
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    bundled.outputFiles[0].contents,
  ).toString('base64')}`;
  return import(moduleUrl);
}

const { normalizeLipSyncLevel } = await importBundled(
  path.join('src', 'domain', 'lip-sync.ts'),
);

function pngDimensions(buffer) {
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test('normalizes streamed audio into stable mouth openness', () => {
  assert.equal(normalizeLipSyncLevel(undefined), undefined);
  assert.equal(normalizeLipSyncLevel(Number.NaN), undefined);
  assert.equal(normalizeLipSyncLevel(0.01), 0);
  assert.equal(normalizeLipSyncLevel(1), 1);
  const low = normalizeLipSyncLevel(0.1);
  const medium = normalizeLipSyncLevel(0.25);
  assert.ok(low > 0);
  assert.ok(medium > low);
});

test('includes compact feathered mouth patches for both tutors', async () => {
  const tutors = ['maya', 'daniel'];
  const expectedPatchSizes = {
    maya: { width: 326, height: 182 },
    daniel: { width: 301, height: 201 },
  };
  for (const tutor of tutors) {
    const neutral = await readFile(
      path.join(projectRoot, 'assets', 'images', 'tutors', `${tutor}.png`),
    );
    const neutralSize = pngDimensions(neutral);
    for (const shape of ['ah', 'oh']) {
      const patchBuffer = await readFile(
        path.join(
          projectRoot,
          'assets',
          'images',
          'tutors',
          `${tutor}-mouth-${shape}.png`,
        ),
      );
      const patchSize = pngDimensions(patchBuffer);
      const patch = PNG.sync.read(patchBuffer);
      assert.deepEqual(patchSize, expectedPatchSizes[tutor]);
      assert.ok(patchSize.width < neutralSize.width * 0.4);
      assert.ok(patchSize.height < neutralSize.height * 0.25);

      const alphaAt = (x, y) => patch.data[(y * patch.width + x) * 4 + 3];
      for (let x = 0; x < patch.width; x += 1) {
        assert.equal(alphaAt(x, 0), 0);
        assert.equal(alphaAt(x, patch.height - 1), 0);
      }
      for (let y = 0; y < patch.height; y += 1) {
        assert.equal(alphaAt(0, y), 0);
        assert.equal(alphaAt(patch.width - 1, y), 0);
      }
      assert.ok(
        alphaAt(Math.floor(patch.width / 2), Math.floor(patch.height / 2)) >= 245,
      );
    }
  }
});

test('uses image-based mouth frames and speech-boundary cues', async () => {
  const avatarSource = await readFile(
    path.join(
      projectRoot,
      'src',
      'components',
      'tutor',
      'professional-avatar.tsx',
    ),
    'utf8',
  );
  const localVoiceSource = await readFile(
    path.join(projectRoot, 'src', 'services', 'local-live-voice.web.ts'),
    'utf8',
  );
  const voiceTurnSource = await readFile(
    path.join(projectRoot, 'src', 'services', 'voice-turn.ts'),
    'utf8',
  );

  assert.match(avatarSource, /maya-mouth-ah\.png/u);
  assert.match(avatarSource, /maya-mouth-oh\.png/u);
  assert.match(avatarSource, /daniel-mouth-ah\.png/u);
  assert.match(avatarSource, /daniel-mouth-oh\.png/u);
  assert.doesNotMatch(avatarSource, /speaking-(?:ah|oh)\.png/u);
  assert.match(avatarSource, /boundaryAccent/u);
  assert.doesNotMatch(avatarSource, /backgroundColor:\s*placement\.color/u);
  assert.match(localVoiceSource, /utterance\.onboundary/u);
  assert.match(localVoiceSource, /utterance\.onboundary\s*=\s*null/u);
  assert.match(voiceTurnSource, /onBoundary:/u);
  assert.match(
    voiceTurnSource,
    /if\s*\(!settled\s*&&\s*!signal\?\.aborted\)/u,
  );
  assert.match(voiceTurnSource, /SPEECH_PLAYBACK_MAX_TIMEOUT_MS/u);
  assert.match(voiceTurnSource, /VOICE_DISCOVERY_TIMEOUT_MS/u);
  assert.match(voiceTurnSource, /selectSystemVoice\(persona, signal\)/u);
  assert.match(voiceTurnSource, /addEventListener\('abort', abortChunk/u);
  assert.match(voiceTurnSource, /if\s*\(signal\?\.aborted\)\s*finish\(\)/u);
});

test('throttles streamed audio-level updates before rerendering the avatar', async () => {
  const realtimeVoiceSource = await readFile(
    path.join(projectRoot, 'src', 'services', 'realtime-voice.web.ts'),
    'utf8',
  );

  assert.match(realtimeVoiceSource, /AUDIO_LEVEL_EMIT_INTERVAL_MS\s*=\s*40/u);
  assert.match(realtimeVoiceSource, /smoothedAudioLevel/u);
  assert.match(realtimeVoiceSource, /AUDIO_LEVEL_DEADBAND/u);
});
