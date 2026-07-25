import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function importBundled(entryPath) {
  const bundled = await build({
    bundle: true,
    entryPoints: [path.join(projectRoot, entryPath)],
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    bundled.outputFiles[0].contents,
  ).toString('base64')}`;
  return import(moduleUrl);
}

const localVoice = await importBundled(
  path.join('src', 'services', 'local-live-voice.web.ts'),
);
const voiceMode = await importBundled(
  path.join('src', 'domain', 'voice-mode.ts'),
);
const voiceRouter = await importBundled(
  path.join('src', 'services', 'live-voice-router.ts'),
);

const persona = {
  id: 'maya',
  name: 'Maya',
  presentation: 'Female voice',
  title: 'Security leadership coach',
  realtimeVoice: 'marin',
  systemPitch: 1.03,
  summary: 'Test persona',
};

function localVoiceRecord(overrides = {}) {
  return {
    default: true,
    lang: 'en-US',
    localService: true,
    name: 'Ava Local',
    voiceURI: 'ava-local',
    ...overrides,
  };
}

function createRecognitionClass(initialAvailability = 'available') {
  return class FakeRecognition {
    static availability = initialAvailability;
    static availableCalls = [];
    static installCalls = [];
    static instances = [];

    static async available(options) {
      this.availableCalls.push(options);
      return this.availability;
    }

    static async install(options) {
      this.installCalls.push(options);
      this.availability = 'available';
      return true;
    }

    continuous = false;
    interimResults = false;
    lang = '';
    maxAlternatives = 0;
    processLocally = false;
    onend = null;
    onerror = null;
    onboundary = null;
    onresult = null;
    onstart = null;
    startWasLocal = false;
    active = false;

    constructor() {
      this.constructor.instances.push(this);
    }

    start() {
      if (this.active) throw new DOMException('Already active', 'InvalidStateError');
      this.active = true;
      this.startWasLocal = this.processLocally === true;
      queueMicrotask(() => this.onstart?.(new Event('start')));
    }

    stop() {
      queueMicrotask(() => {
        this.active = false;
        this.onend?.(new Event('end'));
      });
    }

    abort() {
      queueMicrotask(() => {
        this.active = false;
        this.onerror?.({ error: 'aborted', message: '', type: 'error' });
        this.onend?.(new Event('end'));
      });
    }

    emitResult(text, isFinal) {
      this.emitResults([{ text, isFinal }]);
    }

    emitResults(results) {
      this.onresult?.({
        resultIndex: 0,
        results: Object.assign(
          results.map((result) => ({
            0: { transcript: result.text },
            isFinal: result.isFinal,
            length: 1,
          })),
          { length: results.length },
        ),
        type: 'result',
      });
    }
  };
}

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.voice = null;
    this.pitch = 1;
    this.rate = 1;
    this.onend = null;
    this.onerror = null;
  }
}

function installBrowserEnvironment({
  Recognition,
  voices = [localVoiceRecord()],
  spoken = [],
  secure = true,
  autoFinishSpeech = true,
}) {
  const windowEvents = new EventTarget();
  const documentEvents = new EventTarget();
  const synthesisEvents = new EventTarget();
  const synthesis = {
    addEventListener: synthesisEvents.addEventListener.bind(synthesisEvents),
    removeEventListener: synthesisEvents.removeEventListener.bind(synthesisEvents),
    getVoices: () => voices,
    cancel() {},
    pause() {},
    pending: false,
    paused: false,
    resume() {},
    speak(utterance) {
      spoken.push(utterance);
      if (autoFinishSpeech) {
        queueMicrotask(() => utterance.onend?.(new Event('end')));
      }
    },
    speaking: false,
  };
  globalThis.window = {
    SpeechRecognition: Recognition,
    SpeechSynthesisUtterance: FakeUtterance,
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    dispatchEvent: windowEvents.dispatchEvent.bind(windowEvents),
    isSecureContext: secure,
    speechSynthesis: synthesis,
  };
  globalThis.document = {
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
    removeEventListener: documentEvents.removeEventListener.bind(documentEvents),
    dispatchEvent: documentEvents.dispatchEvent.bind(documentEvents),
    visibilityState: 'visible',
  };
  return { synthesis };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test.afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
});

test('routes custom-provider live voice to the local-device transport', () => {
  assert.equal(
    voiceMode.resolveLiveVoiceTransport('custom'),
    'local-device',
  );
  assert.equal(
    voiceMode.resolveLiveVoiceTransport('openai'),
    'openai-realtime',
  );
});

test('the provider-aware session factory never constructs Realtime for custom AI', () => {
  const calls = [];
  const localSession = { kind: 'local' };
  const openaiSession = { kind: 'openai' };
  const options = {
    provider: 'custom',
    local: { persona, providerResponder: async () => 'answer' },
    openai: {},
  };
  const result = voiceRouter.createProviderAwareLiveVoiceSession(options, {
    local: () => {
      calls.push('local');
      return localSession;
    },
    openai: () => {
      calls.push('openai');
      return openaiSession;
    },
  });

  assert.equal(result, localSession);
  assert.deepEqual(calls, ['local']);
});

test('rejects prefixed, cloud-only, and insecure recognition environments', () => {
  globalThis.window = {
    isSecureContext: true,
    speechSynthesis: {},
    SpeechSynthesisUtterance: FakeUtterance,
    webkitSpeechRecognition: class {},
  };
  assert.equal(localVoice.getLocalLiveVoiceAvailability().supported, false);

  const Recognition = createRecognitionClass();
  installBrowserEnvironment({ Recognition, secure: false });
  assert.equal(localVoice.getLocalLiveVoiceAvailability().supported, false);
});

test('installs and rechecks a downloadable on-device language pack', async () => {
  const Recognition = createRecognitionClass('downloadable');
  await localVoice.ensureOnDeviceRecognitionAvailable(Recognition, 'en-US');

  assert.equal(Recognition.installCalls.length, 1);
  assert.equal(Recognition.availableCalls.length, 2);
  for (const call of [
    ...Recognition.availableCalls,
    ...Recognition.installCalls,
  ]) {
    assert.equal(call.processLocally, true);
    assert.deepEqual(call.langs, ['en-US']);
  }
});

test('fails closed when the on-device language pack is unavailable', async () => {
  const Recognition = createRecognitionClass('unavailable');
  await assert.rejects(
    localVoice.ensureOnDeviceRecognitionAvailable(Recognition, 'en-US'),
    /on-device English speech pack is unavailable/iu,
  );
  assert.equal(Recognition.installCalls.length, 0);
});

test('selects only a device-local synthesis voice', () => {
  const remoteVoice = localVoiceRecord({
    localService: false,
    name: 'Remote Ava',
    voiceURI: 'remote-ava',
  });
  const deviceVoice = localVoiceRecord({
    name: 'Ava Device',
    voiceURI: 'device-ava',
  });
  assert.equal(
    localVoice.chooseLocalSpeechVoice([remoteVoice, deviceVoice], persona),
    deviceVoice,
  );
  assert.equal(
    localVoice.chooseLocalSpeechVoice([remoteVoice], persona),
    undefined,
  );
});

test('opening and recognized turns use only the configured responder', async () => {
  const Recognition = createRecognitionClass();
  const spoken = [];
  installBrowserEnvironment({ Recognition, spoken });
  const providerCalls = [];
  const transcripts = [];
  const delivered = [];
  let networkCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error('Unexpected network request');
  };

  try {
    const session = localVoice.createLocalLiveVoiceSession({
      persona,
      providerResponder: async (turn) => {
        providerCalls.push(turn.text);
        return `Local answer ${providerCalls.length}`;
      },
      callbacks: {
        onTranscript: (line) => transcripts.push(line),
        onProviderAnswerDelivered: (answer) => delivered.push(answer),
      },
    });
    await session.connect();
    const recognition = Recognition.instances.at(-1);
    assert.equal(recognition.startWasLocal, true);

    recognition.emitResult('interim question', false);
    await flushAsyncWork();
    assert.equal(providerCalls.length, 0);

    recognition.emitResults([
      { text: 'final fragment', isFinal: true },
      { text: '', isFinal: false },
    ]);
    await flushAsyncWork();
    assert.equal(providerCalls.length, 0);

    recognition.emitResult('final question', true);
    await flushAsyncWork();
    assert.deepEqual(providerCalls, ['final question']);
    assert.equal(
      transcripts.some(
        (line) =>
          line.role === 'assistant' &&
          line.text === 'Local answer 1' &&
          line.isFinal,
      ),
      true,
    );
    assert.deepEqual(delivered.map((answer) => answer.text), ['Local answer 1']);
    assert.equal(spoken[0].voice.localService, true);

    session.sendText('Opening tutor prompt');
    await flushAsyncWork();
    assert.deepEqual(providerCalls, [
      'final question',
      'Opening tutor prompt',
    ]);
    assert.equal(networkCalls, 0);
    session.end();
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('emits active word boundaries and ignores late speech callbacks', async () => {
  const Recognition = createRecognitionClass();
  const spoken = [];
  installBrowserEnvironment({
    Recognition,
    spoken,
    autoFinishSpeech: false,
  });
  const boundaryCues = [];
  const session = localVoice.createLocalLiveVoiceSession({
    persona,
    providerResponder: async () => 'A local spoken answer.',
    callbacks: {
      onSpeechBoundary: () => boundaryCues.push('cue'),
    },
  });

  await session.connect();
  session.sendText('Begin the local tutor reply.');
  await flushAsyncWork();

  const utterance = spoken.at(-1);
  const lateBoundary = utterance.onboundary;
  lateBoundary({ name: 'word', charIndex: 0 });
  lateBoundary({ name: 'sentence', charIndex: 7 });
  lateBoundary({ name: '', charIndex: 0 });
  assert.equal(boundaryCues.length, 2);

  session.cancelResponse();
  assert.equal(utterance.onboundary, null);
  lateBoundary({ name: 'word', charIndex: 0 });
  assert.equal(boundaryCues.length, 2);
  session.end();
});

test('waits for recognition end before restarting after a fast mute cycle', async () => {
  const Recognition = createRecognitionClass();
  Recognition.prototype.abort = function abortSlowly() {
    setTimeout(() => {
      this.active = false;
      this.onerror?.({ error: 'aborted', message: '', type: 'error' });
      this.onend?.(new Event('end'));
    }, 250);
  };
  installBrowserEnvironment({ Recognition });
  const errors = [];
  const session = localVoice.createLocalLiveVoiceSession({
    persona,
    providerResponder: async () => 'Local answer',
    callbacks: { onError: (error) => errors.push(error.message) },
  });

  await session.connect();
  session.setMuted(true);
  session.setMuted(false);
  await new Promise((resolve) => setTimeout(resolve, 520));

  assert.deepEqual(errors, []);
  assert.equal(Recognition.instances.at(-1).startWasLocal, true);
  session.end();
});

test('muting while a recognition restart is still starting does not end the session', async () => {
  const Recognition = createRecognitionClass();
  let startCount = 0;
  Recognition.prototype.start = function startWithDelayedRestart() {
    if (this.active) throw new DOMException('Already active', 'InvalidStateError');
    this.active = true;
    this.startWasLocal = this.processLocally === true;
    startCount += 1;
    if (startCount === 2) {
      this.delayedStart = setTimeout(
        () => this.onstart?.(new Event('start')),
        500,
      );
      return;
    }
    queueMicrotask(() => this.onstart?.(new Event('start')));
  };
  Recognition.prototype.abort = function abortPendingStart() {
    clearTimeout(this.delayedStart);
    queueMicrotask(() => {
      this.active = false;
      this.onerror?.({ error: 'aborted', message: '', type: 'error' });
      this.onend?.(new Event('end'));
    });
  };
  installBrowserEnvironment({ Recognition });
  const errors = [];
  const states = [];
  const session = localVoice.createLocalLiveVoiceSession({
    persona,
    providerResponder: async () => 'Local answer',
    callbacks: {
      onError: (error) => errors.push(error.message),
      onStateChange: (state) => states.push(state),
    },
  });

  await session.connect();
  session.setMuted(true);
  await flushAsyncWork();
  session.setMuted(false);
  await new Promise((resolve) => setTimeout(resolve, 230));
  session.setMuted(true);
  await flushAsyncWork();
  session.setMuted(false);
  await new Promise((resolve) => setTimeout(resolve, 230));

  assert.deepEqual(errors, []);
  assert.equal(states.includes('ended'), false);
  assert.equal(startCount, 3);
  session.end();
});

test('the local live implementation contains no managed voice endpoint', async () => {
  const source = await readFile(
    path.join(projectRoot, 'src', 'services', 'local-live-voice.web.ts'),
    'utf8',
  );
  assert.doesNotMatch(
    source,
    /\/api\/voice\/(?:session|transcribe)|api\.openai\.com|webkitSpeechRecognition/iu,
  );
  assert.match(source, /processLocally\s*=\s*true/u);
  assert.match(source, /localService\s*===\s*true/u);
  assert.match(source, /recognitionStopping/u);
  assert.match(source, /speechTimeout/u);
});
