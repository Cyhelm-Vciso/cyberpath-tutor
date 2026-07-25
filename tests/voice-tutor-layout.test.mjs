import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(
  path.join(projectRoot, 'src', 'app', 'voice-tutor.tsx'),
  'utf8',
);
const profileSource = await readFile(
  path.join(projectRoot, 'src', 'app', '(tabs)', 'profile.tsx'),
  'utf8',
);

test('keeps long transcript answers inside a responsive scroll region', () => {
  const transcriptScroll =
    source.match(
      /<ScrollView\s+ref=\{captionScrollRef\}[\s\S]*?<\/ScrollView>/u,
    )?.[0] ?? '';

  assert.match(source, /testID="transcript-card"/u);
  assert.match(transcriptScroll, /testID="transcript-scroll"/u);
  assert.match(transcriptScroll, /nestedScrollEnabled/u);
  assert.match(transcriptScroll, /maxHeight:\s*captionBodyMaxHeight/u);
  assert.match(transcriptScroll, /newestCaptions\.map/u);
  assert.match(transcriptScroll, /style=\{styles\.captionLine\}/u);
  assert.match(
    source,
    /captionBodyMaxHeight\s*=\s*Math\.min\(\s*260,\s*Math\.max\(\s*120,/u,
  );
});

test('clips the card border while preserving access to overflow content', () => {
  const captionCardStyle = source.match(/captionCard:\s*\{([^}]+)\}/u)?.[1] ?? '';
  assert.match(captionCardStyle, /overflow:\s*'hidden'/u);
  assert.doesNotMatch(captionCardStyle, /maxHeight/u);
  assert.match(source, /captionText:\s*\{[^}]*minWidth:\s*0/u);
  assert.match(source, /testID="live-controls"/u);
});

test('keeps public-demo voice on local live conversation and disables managed turns', () => {
  assert.match(source, /BUILT_IN_OPENAI_AVAILABLE/u);
  assert.match(
    source,
    /const effectiveVoicePreference = BUILT_IN_OPENAI_AVAILABLE[\s\S]*?: 'realtime';/u,
  );
  assert.match(
    source,
    /const useRealtime =\s*!BUILT_IN_OPENAI_AVAILABLE \|\| resolvedVoiceEngine === 'realtime';/u,
  );
  assert.match(
    source,
    /engine === 'turn-based' && !BUILT_IN_OPENAI_AVAILABLE/u,
  );
  assert.match(
    source,
    /disabled=\{!BUILT_IN_OPENAI_AVAILABLE \|\| engineSelectionLocked\}/u,
  );
  assert.match(source, /Provider Voice Turns · unavailable/u);
  assert.match(
    source,
    /Unavailable on public site · managed transcription is disabled/u,
  );
});

test('explains the public-demo provider policy from Profile', () => {
  assert.match(profileSource, /BUILT_IN_OPENAI_AVAILABLE/u);
  assert.match(
    profileSource,
    /Built-in OpenAI is unavailable in this public demo/u,
  );
});
