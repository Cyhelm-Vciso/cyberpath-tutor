import type { VoicePersona } from '@/domain/voice';

import type { LocalLiveVoiceOptions } from './local-live-voice.types';
import {
  RealtimeVoiceError,
  type RealtimeVoiceAvailability,
  type RealtimeVoiceSession,
  type RealtimeVoiceState,
} from './realtime-voice.types';

export type { LocalLiveVoiceOptions } from './local-live-voice.types';

const DEFAULT_LANGUAGE = 'en-US';
const MAX_TEXT_INPUT_LENGTH = 4_000;
const MAX_TRANSCRIPT_LENGTH = 12_000;
const MAX_SPOKEN_ANSWER_LENGTH = 6_000;
const RECOGNITION_START_TIMEOUT_MS = 60_000;
const VOICE_DISCOVERY_TIMEOUT_MS = 1_500;
const RESTART_DELAY_MS = 180;
const SPEECH_CHUNK_LENGTH = 700;
const MIN_SPEECH_TIMEOUT_MS = 15_000;
const MAX_SPEECH_TIMEOUT_MS = 60_000;

type RecognitionAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable';

interface OnDeviceRecognitionOptions {
  langs: string[];
  processLocally: true;
}

interface RecognitionAlternativeLike {
  transcript: string;
}

interface RecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternativeLike;
}

interface RecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: RecognitionResultLike;
}

interface RecognitionResultEventLike extends Event {
  readonly resultIndex: number;
  readonly results: RecognitionResultListLike;
}

interface RecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

interface StrictSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  processLocally: boolean;
  onend: ((event: Event) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onresult: ((event: RecognitionResultEventLike) => void) | null;
  onstart: ((event: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface StrictSpeechRecognitionConstructor {
  new (): StrictSpeechRecognition;
  available(options: OnDeviceRecognitionOptions): Promise<RecognitionAvailability>;
  install(options: OnDeviceRecognitionOptions): Promise<boolean>;
}

interface LocalSpeechWindow extends Window {
  SpeechRecognition?: StrictSpeechRecognitionConstructor;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
}

interface PendingRecognitionStart {
  reject: (error: RealtimeVoiceError) => void;
  resolve: () => void;
  timeout: ReturnType<typeof setTimeout>;
}

const voiceNameHints: Record<VoicePersona['id'], RegExp> = {
  maya: /\b(ava|aria|hazel|jenny|karen|samantha|susan|victoria|zira|female|woman)\b/iu,
  daniel: /\b(alex|daniel|david|george|guy|james|mark|tom|male|man)\b/iu,
};

function localSpeechWindow(): LocalSpeechWindow | undefined {
  return typeof window === 'undefined' ? undefined : (window as LocalSpeechWindow);
}

function strictRecognitionConstructor(): StrictSpeechRecognitionConstructor | undefined {
  const Recognition = localSpeechWindow()?.SpeechRecognition;
  if (
    typeof Recognition !== 'function' ||
    typeof Recognition.available !== 'function' ||
    typeof Recognition.install !== 'function'
  ) {
    return undefined;
  }

  try {
    const probe = new Recognition();
    if (!('processLocally' in probe)) return undefined;
    return Recognition;
  } catch {
    return undefined;
  }
}

function unsupportedError(message: string): RealtimeVoiceError {
  return new RealtimeVoiceError(message, {
    code: 'unsupported',
    recoverable: true,
  });
}

function safeProviderMessage(error: unknown): string {
  const fallback = 'The configured AI provider could not answer this turn.';
  if (!(error instanceof Error)) return fallback;
  return error.message
    .replace(/[\u0000-\u001F\u007F]/gu, ' ')
    .replace(/\bBearer\s+[^\s,;]+/giu, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 400) || fallback;
}

function splitForLocalSpeech(text: string): string[] {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (normalized.length <= SPEECH_CHUNK_LENGTH) return [normalized];

  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length) {
    if (remaining.length <= SPEECH_CHUNK_LENGTH) {
      chunks.push(remaining);
      break;
    }
    const candidate = remaining.slice(0, SPEECH_CHUNK_LENGTH);
    const boundary = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf(' '),
    );
    const splitAt =
      boundary > SPEECH_CHUNK_LENGTH * 0.55
        ? boundary + 1
        : SPEECH_CHUNK_LENGTH;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks;
}

function recognitionError(errorCode: string): RealtimeVoiceError {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return new RealtimeVoiceError(
        'Microphone or on-device speech access was not allowed. Enable it in browser settings and try again.',
        { code: 'microphone-denied', recoverable: true },
      );
    case 'audio-capture':
      return new RealtimeVoiceError(
        'No available microphone could be started. Check the device and try again.',
        { code: 'microphone-unavailable', recoverable: true },
      );
    case 'language-not-supported':
      return unsupportedError(
        'The on-device English speech pack is unavailable. Install it in this browser and try again.',
      );
    case 'network':
      return unsupportedError(
        'On-device recognition could not start. The app will not switch to an online speech service.',
      );
    default:
      return new RealtimeVoiceError(
        'On-device speech recognition stopped unexpectedly. End the session and try again.',
        { code: 'transcription-failed', recoverable: true },
      );
  }
}

export function getLocalLiveVoiceAvailability(): RealtimeVoiceAvailability {
  const scope = localSpeechWindow();
  if (!scope?.isSecureContext) {
    return {
      supported: false,
      mode: 'turn-based',
      reason: 'Local live voice requires this app to be opened over HTTPS.',
    };
  }

  if (!strictRecognitionConstructor()) {
    return {
      supported: false,
      mode: 'turn-based',
      reason:
        'This browser does not support strict on-device speech recognition. The app will not fall back to OpenAI.',
    };
  }

  if (
    !scope.speechSynthesis ||
    typeof scope.SpeechSynthesisUtterance !== 'function'
  ) {
    return {
      supported: false,
      mode: 'turn-based',
      reason:
        'This browser does not provide device speech playback. The app will not fall back to OpenAI.',
    };
  }

  return { supported: true, mode: 'realtime' };
}

export async function ensureOnDeviceRecognitionAvailable(
  Recognition: StrictSpeechRecognitionConstructor,
  language = DEFAULT_LANGUAGE,
): Promise<void> {
  const options: OnDeviceRecognitionOptions = {
    langs: [language],
    processLocally: true,
  };
  let availability = await Recognition.available(options);
  if (availability === 'available') return;

  if (availability === 'downloadable' || availability === 'downloading') {
    const installed = await Recognition.install(options);
    if (installed) {
      availability = await Recognition.available(options);
      if (availability === 'available') return;
    }
  }

  throw unsupportedError(
    'The on-device English speech pack is unavailable. Install it in this browser and try again.',
  );
}

export function chooseLocalSpeechVoice(
  voices: SpeechSynthesisVoice[],
  persona: VoicePersona,
  language = DEFAULT_LANGUAGE,
): SpeechSynthesisVoice | undefined {
  const languageRoot = language.split('-', 1)[0]?.toLowerCase() || 'en';
  const localVoices = voices.filter(
    (voice) =>
      voice.localService === true &&
      voice.lang.toLowerCase().split('-', 1)[0] === languageRoot,
  );
  return (
    localVoices.find((voice) =>
      voiceNameHints[persona.id].test(`${voice.name} ${voice.voiceURI}`),
    ) ?? localVoices.find((voice) => voice.default) ?? localVoices[0]
  );
}

async function waitForLocalSpeechVoice(
  synthesis: SpeechSynthesis,
  persona: VoicePersona,
  language: string,
): Promise<SpeechSynthesisVoice | undefined> {
  const immediate = chooseLocalSpeechVoice(
    synthesis.getVoices(),
    persona,
    language,
  );
  if (immediate) return immediate;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      synthesis.removeEventListener('voiceschanged', finish);
      resolve();
    };
    const timeout = setTimeout(finish, VOICE_DISCOVERY_TIMEOUT_MS);
    synthesis.addEventListener('voiceschanged', finish, { once: true });
  });

  return chooseLocalSpeechVoice(synthesis.getVoices(), persona, language);
}

class WebLocalLiveVoiceSession implements RealtimeVoiceSession {
  private currentState: RealtimeVoiceState = 'idle';
  private isMuted = false;
  private connected = false;
  private connecting = false;
  private ended = false;
  private recognition: StrictSpeechRecognition | null = null;
  private recognitionRunning = false;
  private recognitionStarting = false;
  private recognitionStopping = false;
  private ignoreAbortError = false;
  private activeInputId = '';
  private inputSequence = 0;
  private finalInputHandled = false;
  private pendingStart: PendingRecognitionStart | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private providerController: AbortController | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private utteranceConstructor: typeof SpeechSynthesisUtterance | null = null;
  private localVoice: SpeechSynthesisVoice | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private settleSpeech: ((completed: boolean) => void) | null = null;
  private speechTimeout: ReturnType<typeof setTimeout> | null = null;
  private handlingTurn = false;
  private sessionToken = 0;
  private actionToken = 0;
  private readonly handlePageHide = () => {
    if (!this.ended) this.end();
  };
  private readonly handleVisibilityChange = () => {
    if (!this.ended && document.visibilityState === 'hidden') this.end();
  };

  constructor(private readonly options: LocalLiveVoiceOptions) {}

  get state(): RealtimeVoiceState {
    return this.currentState;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  get remoteStream(): MediaStream | null {
    return null;
  }

  get audioElement(): HTMLAudioElement | null {
    return null;
  }

  async connect(): Promise<void> {
    if (this.connecting || this.connected) {
      throw new RealtimeVoiceError('A local live voice session is already active.', {
        code: 'invalid-configuration',
        recoverable: true,
      });
    }

    const availability = getLocalLiveVoiceAvailability();
    if (!availability.supported) {
      throw unsupportedError(
        availability.reason ?? 'Local live voice is unavailable in this browser.',
      );
    }

    const scope = localSpeechWindow()!;
    const Recognition = strictRecognitionConstructor()!;
    const token = ++this.sessionToken;
    this.connecting = true;
    this.ended = false;
    this.installPageLifecycleHandlers();
    this.setState('requesting-permission');

    try {
      await ensureOnDeviceRecognitionAvailable(
        Recognition,
        this.options.language ?? DEFAULT_LANGUAGE,
      );
      if (this.ended || token !== this.sessionToken) {
        throw new RealtimeVoiceError('The local live voice session was canceled.', {
          code: 'aborted',
          recoverable: true,
        });
      }

      this.setState('connecting');
      const voice = await waitForLocalSpeechVoice(
        scope.speechSynthesis,
        this.options.persona,
        this.options.language ?? DEFAULT_LANGUAGE,
      );
      if (!voice?.localService) {
        throw unsupportedError(
          'No device-local English speaking voice is installed. Add a system voice and try again.',
        );
      }
      if (this.ended || token !== this.sessionToken) {
        throw new RealtimeVoiceError('The local live voice session was canceled.', {
          code: 'aborted',
          recoverable: true,
        });
      }

      this.synthesis = scope.speechSynthesis;
      this.utteranceConstructor = scope.SpeechSynthesisUtterance!;
      this.localVoice = voice;
      this.recognition = new Recognition();
      this.configureRecognition(this.recognition, token);
      this.connected = true;
      await this.startRecognition(token, true);
    } catch (caught) {
      const error =
        caught instanceof RealtimeVoiceError
          ? caught
          : unsupportedError(
              'Local live voice could not start. The app did not switch to an online speech service.',
            );
      if (!this.ended) this.fail(error);
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.options.callbacks?.onMutedChange?.(muted);
    if (muted) {
      this.clearRestartTimer();
      this.pauseRecognition();
      return;
    }
    if (this.connected && !this.handlingTurn && !this.ended) {
      this.setState('listening');
      this.scheduleRecognition();
    }
  }

  sendText(text: string): void {
    const normalized = text.trim();
    if (!this.connected || this.ended) {
      throw new RealtimeVoiceError('The local live voice session is not connected.', {
        code: 'connection-failed',
        recoverable: true,
      });
    }
    if (!normalized || normalized.length > MAX_TEXT_INPUT_LENGTH) {
      throw new RealtimeVoiceError(
        `Text input must contain 1 to ${MAX_TEXT_INPUT_LENGTH.toLocaleString()} characters.`,
        { code: 'invalid-configuration', recoverable: true },
      );
    }

    void this.handleTutorTurn(
      `opening_${++this.inputSequence}`,
      normalized,
      this.sessionToken,
    );
  }

  cancelResponse(): void {
    if (!this.connected || this.ended) return;
    this.actionToken += 1;
    this.providerController?.abort();
    this.providerController = null;
    this.cancelSpeech();
    this.handlingTurn = false;
    if (!this.isMuted) {
      this.setState('listening');
      this.scheduleRecognition();
    }
  }

  async resumeAudio(): Promise<void> {
    this.synthesis?.resume();
  }

  end(): void {
    if (this.ended && this.currentState === 'ended') return;
    this.dispose('ended');
  }

  private configureRecognition(
    recognition: StrictSpeechRecognition,
    token: number,
  ): void {
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = this.options.language ?? DEFAULT_LANGUAGE;
    recognition.maxAlternatives = 1;
    recognition.processLocally = true;
    recognition.onstart = () => {
      if (this.ended || token !== this.sessionToken) return;
      this.recognitionStarting = false;
      this.recognitionRunning = true;
      this.resolvePendingStart();
      if (!this.isMuted && !this.handlingTurn) this.setState('listening');
    };
    recognition.onresult = (event) => {
      if (this.ended || token !== this.sessionToken || this.finalInputHandled) {
        return;
      }

      const parts: string[] = [];
      let hasInterim = false;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim();
        if (transcript) parts.push(transcript);
        if (result?.isFinal === false) hasInterim = true;
      }
      const text = parts.join(' ').trim().slice(0, MAX_TRANSCRIPT_LENGTH);
      if (!text) return;
      const isFinal = !hasInterim;

      this.options.callbacks?.onTranscript?.({
        id: this.activeInputId,
        role: 'user',
        text,
        isFinal,
      });
      if (!isFinal) return;

      this.finalInputHandled = true;
      void this.handleTutorTurn(this.activeInputId, text, token);
    };
    recognition.onerror = (event) => {
      if (this.ended || token !== this.sessionToken) return;
      if (
        event.error === 'aborted' &&
        (this.ignoreAbortError || this.handlingTurn || this.isMuted)
      ) {
        return;
      }
      if (event.error === 'no-speech') return;

      const error = recognitionError(event.error);
      if (this.pendingStart) {
        this.rejectPendingStart(error);
      } else {
        this.fail(error);
      }
    };
    recognition.onend = () => {
      if (token !== this.sessionToken) return;
      const expectedStop =
        this.ignoreAbortError ||
        this.isMuted ||
        this.handlingTurn ||
        this.recognitionStopping;
      this.recognitionRunning = false;
      this.recognitionStarting = false;
      this.recognitionStopping = false;
      this.ignoreAbortError = false;
      if (this.pendingStart) {
        if (expectedStop) {
          this.resolvePendingStart();
        } else {
          this.rejectPendingStart(
            new RealtimeVoiceError('The microphone could not start on this device.', {
              code: 'microphone-unavailable',
              recoverable: true,
            }),
          );
        }
      }
      if (
        !this.ended &&
        this.connected &&
        !this.isMuted &&
        !this.handlingTurn
      ) {
        this.scheduleRecognition();
      }
    };
  }

  private startRecognition(token: number, waitForStart = false): Promise<void> {
    if (
      this.ended ||
      !this.connected ||
      this.isMuted ||
      this.handlingTurn ||
      !this.recognition ||
      this.recognitionRunning ||
      this.recognitionStarting ||
      this.recognitionStopping ||
      token !== this.sessionToken
    ) {
      return Promise.resolve();
    }

    this.clearRestartTimer();
    this.activeInputId = `local_${Date.now()}_${++this.inputSequence}`;
    this.finalInputHandled = false;
    this.recognition.processLocally = true;
    this.recognitionStarting = true;

    let started = Promise.resolve();
    if (waitForStart) {
      started = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!this.pendingStart) return;
          this.pendingStart = null;
          this.recognitionStarting = false;
          reject(
            new RealtimeVoiceError(
              'The browser took too long to start on-device speech recognition.',
              { code: 'microphone-unavailable', recoverable: true },
            ),
          );
        }, RECOGNITION_START_TIMEOUT_MS);
        this.pendingStart = { reject, resolve, timeout };
      });
    } else {
      const timeout = setTimeout(() => {
        if (!this.pendingStart) return;
        const error = new RealtimeVoiceError(
          'The browser took too long to restart on-device speech recognition.',
          { code: 'microphone-unavailable', recoverable: true },
        );
        this.rejectPendingStart(error);
      }, RECOGNITION_START_TIMEOUT_MS);
      this.pendingStart = {
        reject: (error) => this.fail(error),
        resolve: () => undefined,
        timeout,
      };
    }

    try {
      this.recognition.start();
    } catch {
      this.recognitionStarting = false;
      const error = new RealtimeVoiceError(
        'The microphone could not start on this device.',
        { code: 'microphone-unavailable', recoverable: true },
      );
      if (this.pendingStart) this.rejectPendingStart(error);
      else this.fail(error);
    }
    return started;
  }

  private resolvePendingStart(): void {
    if (!this.pendingStart) return;
    const pending = this.pendingStart;
    this.pendingStart = null;
    clearTimeout(pending.timeout);
    pending.resolve();
  }

  private rejectPendingStart(error: RealtimeVoiceError): void {
    if (!this.pendingStart) return;
    const pending = this.pendingStart;
    this.pendingStart = null;
    clearTimeout(pending.timeout);
    pending.reject(error);
  }

  private pauseRecognition(): void {
    this.clearRestartTimer();
    if (
      !this.recognition ||
      this.recognitionStopping ||
      (!this.recognitionRunning && !this.recognitionStarting)
    ) {
      return;
    }
    this.ignoreAbortError = true;
    this.recognitionStopping = true;
    try {
      this.recognition.abort();
    } catch {
      this.recognitionRunning = false;
      this.recognitionStarting = false;
      this.recognitionStopping = false;
    }
  }

  private scheduleRecognition(): void {
    if (
      this.restartTimer ||
      this.ended ||
      !this.connected ||
      this.isMuted ||
      this.handlingTurn
    ) {
      return;
    }
    const token = this.sessionToken;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      void this.startRecognition(token);
    }, RESTART_DELAY_MS);
  }

  private clearRestartTimer(): void {
    if (!this.restartTimer) return;
    clearTimeout(this.restartTimer);
    this.restartTimer = null;
  }

  private async handleTutorTurn(
    turnId: string,
    text: string,
    sessionToken: number,
  ): Promise<void> {
    if (this.ended || sessionToken !== this.sessionToken) return;
    const actionToken = ++this.actionToken;
    this.handlingTurn = true;
    this.pauseRecognition();
    this.providerController?.abort();
    const controller = new AbortController();
    this.providerController = controller;
    this.setState('thinking');

    try {
      const answer = await this.options.providerResponder({
        id: turnId,
        text,
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        this.ended ||
        sessionToken !== this.sessionToken ||
        actionToken !== this.actionToken
      ) {
        return;
      }

      const normalizedAnswer = answer.trim().slice(0, MAX_SPOKEN_ANSWER_LENGTH);
      if (!normalizedAnswer) {
        throw new Error('The configured AI provider returned an empty answer.');
      }
      this.options.callbacks?.onTranscript?.({
        id: `provider-${turnId}`,
        role: 'assistant',
        text: normalizedAnswer,
        isFinal: true,
      });
      this.options.callbacks?.onProviderAnswerDelivered?.({
        id: turnId,
        text: normalizedAnswer,
      });

      await this.speakAnswer(normalizedAnswer, actionToken, sessionToken);
    } catch (caught) {
      if (
        controller.signal.aborted ||
        this.ended ||
        sessionToken !== this.sessionToken ||
        actionToken !== this.actionToken
      ) {
        return;
      }
      this.options.callbacks?.onError?.(
        caught instanceof RealtimeVoiceError
          ? caught
          : new RealtimeVoiceError(safeProviderMessage(caught), {
              code: 'provider-error',
              recoverable: true,
            }),
      );
    } finally {
      if (this.providerController === controller) {
        this.providerController = null;
      }
      if (
        !this.ended &&
        sessionToken === this.sessionToken &&
        actionToken === this.actionToken
      ) {
        this.handlingTurn = false;
        if (!this.isMuted) {
          this.setState('listening');
          this.scheduleRecognition();
        }
      }
    }
  }

  private async speakAnswer(
    text: string,
    actionToken: number,
    sessionToken: number,
  ): Promise<boolean> {
    if (
      !this.synthesis ||
      !this.utteranceConstructor ||
      !this.localVoice?.localService
    ) {
      throw unsupportedError(
        'Device-local speech playback is unavailable. The answer remains visible in the transcript.',
      );
    }

    this.cancelSpeech();
    this.setState('speaking');
    for (const chunk of splitForLocalSpeech(text)) {
      if (
        this.ended ||
        actionToken !== this.actionToken ||
        sessionToken !== this.sessionToken
      ) {
        return false;
      }
      const completed = await this.speakChunk(
        chunk,
        actionToken,
        sessionToken,
      );
      if (!completed) return false;
    }
    return true;
  }

  private speakChunk(
    text: string,
    actionToken: number,
    sessionToken: number,
  ): Promise<boolean> {
    const utterance = new this.utteranceConstructor!(text);
    utterance.lang = this.options.language ?? DEFAULT_LANGUAGE;
    utterance.voice = this.localVoice!;
    utterance.pitch = this.options.persona.systemPitch;
    utterance.rate = 0.93;
    this.activeUtterance = utterance;

    return new Promise<boolean>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        utterance.onend = null;
        utterance.onerror = null;
        utterance.onboundary = null;
        if (this.speechTimeout) {
          clearTimeout(this.speechTimeout);
          this.speechTimeout = null;
        }
        if (this.activeUtterance === utterance) this.activeUtterance = null;
        if (this.settleSpeech === finish) this.settleSpeech = null;
      };
      const finish = (completed: boolean) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(completed);
      };
      const failPlayback = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.synthesis?.cancel();
        reject(
          new RealtimeVoiceError(message, {
            code: 'autoplay-blocked',
            recoverable: true,
          }),
        );
      };
      this.settleSpeech = finish;
      utterance.onend = () => finish(true);
      utterance.onboundary = (event) => {
        if (
          settled ||
          this.ended ||
          this.activeUtterance !== utterance ||
          actionToken !== this.actionToken ||
          sessionToken !== this.sessionToken
        ) {
          return;
        }
        const boundaryName =
          typeof event.name === 'string' ? event.name.toLowerCase() : '';
        if (boundaryName && boundaryName !== 'word') return;
        this.options.callbacks?.onSpeechBoundary?.();
      };
      utterance.onerror = (event) => {
        if (settled) return;
        const errorCode =
          typeof (event as SpeechSynthesisErrorEvent).error === 'string'
            ? (event as SpeechSynthesisErrorEvent).error
            : '';
        if (
          errorCode === 'canceled' ||
          errorCode === 'interrupted' ||
          actionToken !== this.actionToken ||
          sessionToken !== this.sessionToken
        ) {
          finish(false);
          return;
        }
        failPlayback(
          'The device voice could not play this reply. The answer remains visible.',
        );
      };
      const timeoutMs = Math.max(
        MIN_SPEECH_TIMEOUT_MS,
        Math.min(MAX_SPEECH_TIMEOUT_MS, text.length * 90),
      );
      this.speechTimeout = setTimeout(() => {
        failPlayback(
          'The device voice took too long to play this reply. The answer remains visible.',
        );
      }, timeoutMs);
      try {
        this.synthesis!.speak(utterance);
      } catch {
        failPlayback(
          'The device voice could not start this reply. The answer remains visible.',
        );
      }
    });
  }

  private cancelSpeech(): void {
    const settle = this.settleSpeech;
    this.settleSpeech = null;
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    this.activeUtterance = null;
    this.synthesis?.cancel();
    settle?.(false);
  }

  private installPageLifecycleHandlers(): void {
    window.addEventListener('pagehide', this.handlePageHide);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private removePageLifecycleHandlers(): void {
    window.removeEventListener('pagehide', this.handlePageHide);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private setState(state: RealtimeVoiceState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.options.callbacks?.onStateChange?.(state);
  }

  private fail(error: RealtimeVoiceError): void {
    if (this.ended) return;
    this.options.callbacks?.onError?.(error);
    this.dispose('error');
  }

  private dispose(finalState: 'ended' | 'error'): void {
    this.ended = true;
    this.connected = false;
    this.connecting = false;
    this.sessionToken += 1;
    this.actionToken += 1;
    this.removePageLifecycleHandlers();
    this.clearRestartTimer();
    if (this.pendingStart) {
      this.rejectPendingStart(
        new RealtimeVoiceError('The local live voice session ended.', {
          code: 'aborted',
          recoverable: true,
        }),
      );
    }
    this.providerController?.abort();
    this.providerController = null;
    this.cancelSpeech();
    if (this.recognition) {
      this.recognition.onstart = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      try {
        this.recognition.abort();
      } catch {
        // The recognizer is already stopped.
      }
    }
    this.recognition = null;
    this.recognitionRunning = false;
    this.recognitionStarting = false;
    this.recognitionStopping = false;
    this.handlingTurn = false;
    this.isMuted = false;
    this.options.callbacks?.onMutedChange?.(false);
    this.options.callbacks?.onAudioLevel?.(0);
    this.setState(finalState);
  }
}

export function createLocalLiveVoiceSession(
  options: LocalLiveVoiceOptions,
): RealtimeVoiceSession {
  return new WebLocalLiveVoiceSession(options);
}
