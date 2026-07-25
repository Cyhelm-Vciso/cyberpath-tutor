import {
  RealtimeVoiceError,
  type RealtimeTranscript,
  type RealtimeVoiceAvailability,
  type RealtimeVoiceOptions,
  type RealtimeVoiceSession,
  type RealtimeVoiceState,
} from './realtime-voice.types';
import {
  createProviderTutorSpeechResponseEvent,
  ProviderLiveTurnState,
  readFinalProviderTutorTurn,
  readProviderTutorErrorContext,
  readProviderTutorResponseIdentity,
  type ProviderSpeechCancellation,
  type ProviderTutorTurn,
} from './realtime-provider-turn';

export * from './realtime-voice.types';

const DEFAULT_SESSION_PATH = '/api/voice/session';
const MAX_SESSION_RESPONSE_BYTES = 1_000_000;
const CHANNEL_OPEN_TIMEOUT_MS = 20_000;
const MAX_TEXT_INPUT_LENGTH = 4_000;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/u;
const AUDIO_LEVEL_EMIT_INTERVAL_MS = 40;
const AUDIO_LEVEL_DEADBAND = 0.008;

interface RealtimeServerEvent extends Record<string, unknown> {
  type: string;
}

interface QueuedProviderSpeech {
  turnId: string;
  answer: string;
  event: ReturnType<typeof createProviderTutorSpeechResponseEvent>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readTranscriptText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function sanitizeMessage(value: unknown, fallback: string): string {
  const message = typeof value === 'string' ? value : fallback;
  return message
    .replace(/[\u0000-\u001F\u007F]/gu, ' ')
    .replace(/\bBearer\s+[^\s,;]+/giu, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu, '[redacted]')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 400);
}

function assertSafeIdentifier(value: string, name: string, maxLength: number): void {
  if (!value || value.length > maxLength || !SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new RealtimeVoiceError(`${name} is not valid.`, {
      code: 'invalid-configuration',
    });
  }
}

function buildSessionUrl(options: RealtimeVoiceOptions): string {
  const rawUrl = options.sessionUrl?.trim() || DEFAULT_SESSION_PATH;
  let url: URL;

  try {
    url = new URL(rawUrl, window.location.origin);
  } catch {
    throw new RealtimeVoiceError('The live voice session URL is not valid.', {
      code: 'invalid-configuration',
    });
  }

  if (url.origin !== window.location.origin || url.username || url.password || url.hash) {
    throw new RealtimeVoiceError('The live voice session route must use this app server.', {
      code: 'invalid-configuration',
    });
  }

  const voice = options.voice?.trim() || 'marin';
  const mode = options.mode ?? 'tutor';
  assertSafeIdentifier(voice, 'The selected voice', 48);
  if (mode !== 'tutor' && mode !== 'interview') {
    throw new RealtimeVoiceError('The selected voice mode is not valid.', {
      code: 'invalid-configuration',
    });
  }

  url.searchParams.set('voice', voice);
  url.searchParams.set('mode', mode);
  return url.toString();
}

function microphoneError(error: unknown): RealtimeVoiceError {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return new RealtimeVoiceError(
        'Microphone access was not allowed. Enable it in your browser settings and try again.',
        { code: 'microphone-denied', recoverable: true },
      );
    }

    if (
      error.name === 'NotFoundError' ||
      error.name === 'NotReadableError' ||
      error.name === 'AbortError'
    ) {
      return new RealtimeVoiceError(
        'No available microphone could be started. Check the device and try again.',
        { code: 'microphone-unavailable', recoverable: true },
      );
    }
  }

  return new RealtimeVoiceError('The microphone could not be started.', {
    code: 'microphone-unavailable',
    recoverable: true,
  });
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SESSION_RESPONSE_BYTES) {
    throw new RealtimeVoiceError('The live voice server returned an oversized response.', {
      code: 'protocol-error',
    });
  }

  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_SESSION_RESPONSE_BYTES) {
      await reader.cancel();
      throw new RealtimeVoiceError('The live voice server returned an oversized response.', {
        code: 'protocol-error',
      });
    }
    result += decoder.decode(value, { stream: true });
  }

  return result + decoder.decode();
}

function readServerError(event: RealtimeServerEvent): string {
  const error = isRecord(event.error) ? event.error : undefined;
  return sanitizeMessage(
    error?.message,
    'The live tutor reported an error. End the session and try again.',
  );
}

function transcriptKey(event: RealtimeServerEvent, role: RealtimeTranscript['role']): string {
  const itemId = readString(event.item_id);
  const responseId = readString(event.response_id);
  return `${role}:${itemId ?? responseId ?? 'current'}`;
}

function transcriptId(key: string): string {
  return key.replace(/^(user|assistant):/u, '');
}

export function getRealtimeVoiceAvailability(): RealtimeVoiceAvailability {
  const supported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof RTCPeerConnection !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  return supported
    ? { supported: true, mode: 'realtime' }
    : {
        supported: false,
        mode: 'turn-based',
        reason:
          'This browser cannot start a live voice session. Use the turn-based microphone mode instead.',
      };
}

class WebRealtimeVoiceSession implements RealtimeVoiceSession {
  private currentState: RealtimeVoiceState = 'idle';
  private isMuted = false;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private currentRemoteStream: MediaStream | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private lastAudioLevelEmitAt = 0;
  private lastEmittedAudioLevel = 0;
  private smoothedAudioLevel = 0;
  private ended = false;
  private connecting = false;
  private terminalError: RealtimeVoiceError | null = null;
  private transcriptBuffers = new Map<string, string>();
  private providerTurnControllers = new Map<string, AbortController>();
  private handledProviderTurnIds = new Set<string>();
  private providerLiveState = new ProviderLiveTurnState();
  private providerCancellationBarriers = new Map<string, string | undefined>();
  private queuedProviderSpeech: QueuedProviderSpeech | null = null;
  private providerOpeningSequence = 0;
  private dataChannelMessageHandler: ((event: MessageEvent) => void) | null = null;
  private dataChannelCloseHandler: (() => void) | null = null;
  private readonly handlePageHide = () => {
    if (!this.ended) this.end();
  };
  private readonly handleVisibilityChange = () => {
    if (!this.ended && document.visibilityState === 'hidden') this.end();
  };

  constructor(private readonly options: RealtimeVoiceOptions) {}

  get state(): RealtimeVoiceState {
    return this.currentState;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  get remoteStream(): MediaStream | null {
    return this.currentRemoteStream;
  }

  get audioElement(): HTMLAudioElement | null {
    return this.currentAudioElement;
  }

  async connect(): Promise<void> {
    if (this.connecting || (this.peerConnection && !this.ended)) {
      throw new RealtimeVoiceError('A live voice session is already active.', {
        code: 'invalid-configuration',
        recoverable: true,
      });
    }

    const availability = getRealtimeVoiceAvailability();
    if (!availability.supported) {
      const error = new RealtimeVoiceError(availability.reason!, {
        code: 'unsupported',
        recoverable: true,
      });
      this.setState('unavailable');
      this.options.callbacks?.onError?.(error);
      throw error;
    }

    this.connecting = true;
    this.ended = false;
    this.terminalError = null;
    this.transcriptBuffers.clear();
    this.handledProviderTurnIds.clear();
    this.providerLiveState.reset();
    this.providerCancellationBarriers.clear();
    this.queuedProviderSpeech = null;
    this.providerOpeningSequence = 0;
    this.abortController = new AbortController();
    this.installPageLifecycleHandlers();
    try {
      const sessionUrl = buildSessionUrl(this.options);
      this.setState('requesting-permission');

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: this.options.microphoneConstraints ?? {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
      } catch (error) {
        throw microphoneError(error);
      }

      if (this.ended) {
        throw new RealtimeVoiceError('The live voice session was canceled.', {
          code: 'aborted',
          recoverable: true,
        });
      }

      this.setState('connecting');
      const peerConnection = new RTCPeerConnection();
      this.peerConnection = peerConnection;
      this.installPeerConnectionHandlers(peerConnection);

      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !this.isMuted;
        peerConnection.addTrack(track, this.localStream);
      }

      const dataChannel = peerConnection.createDataChannel('oai-events');
      this.dataChannel = dataChannel;
      this.installDataChannelHandlers(dataChannel);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const offerSdp = peerConnection.localDescription?.sdp;
      if (!offerSdp) {
        throw new RealtimeVoiceError('The browser could not create a live voice offer.', {
          code: 'connection-failed',
        });
      }

      const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/sdp',
          'Content-Type': 'application/sdp',
        },
        body: offerSdp,
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'error',
        signal: this.abortController.signal,
      });
      const answerSdp = await readLimitedText(response);

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const payload = JSON.parse(answerSdp) as unknown;
          if (isRecord(payload)) {
            const nestedError = isRecord(payload.error) ? payload.error : undefined;
            detail = readString(nestedError?.message) ?? readString(payload.message);
          }
        } catch {
          detail = undefined;
        }
        throw new RealtimeVoiceError(
          sanitizeMessage(detail, 'The app server could not start a live voice session.'),
          {
            code: 'session-failed',
            recoverable: response.status >= 500 || response.status === 429,
            status: response.status,
          },
        );
      }

      if (!answerSdp.trim().startsWith('v=0')) {
        throw new RealtimeVoiceError('The live voice server returned an invalid connection answer.', {
          code: 'protocol-error',
        });
      }

      await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      await this.waitForDataChannelOpen(dataChannel);
      this.setState('connected');
      this.setState('listening');
    } catch (error) {
      const previouslyReportedError = this.terminalError;
      const realtimeError =
        previouslyReportedError ??
        (error instanceof RealtimeVoiceError
          ? error
          : this.abortController?.signal.aborted || this.ended
            ? new RealtimeVoiceError('The live voice session was canceled.', {
                code: 'aborted',
                recoverable: true,
              })
            : new RealtimeVoiceError('The live voice session could not connect.', {
                code: 'connection-failed',
                recoverable: true,
              }));

      this.dispose(realtimeError.code === 'aborted' ? 'ended' : 'error');
      if (!previouslyReportedError && realtimeError.code !== 'aborted') {
        this.options.callbacks?.onError?.(realtimeError);
      }
      throw realtimeError;
    } finally {
      this.connecting = false;
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    for (const track of this.localStream?.getAudioTracks() ?? []) {
      track.enabled = !muted;
    }
    this.options.callbacks?.onMutedChange?.(muted);
  }

  sendText(text: string): void {
    const normalized = text.trim();
    if (!normalized || normalized.length > MAX_TEXT_INPUT_LENGTH) {
      throw new RealtimeVoiceError(
        `Text input must contain 1 to ${MAX_TEXT_INPUT_LENGTH.toLocaleString()} characters.`,
        { code: 'invalid-configuration', recoverable: true },
      );
    }

    if (this.options.providerResponder) {
      const turn: ProviderTutorTurn = {
        id: `opening_${++this.providerOpeningSequence}`,
        text: normalized,
      };
      void this.handleProviderTutorTurn(turn);
      return;
    }

    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: normalized }],
      },
    });
    this.sendEvent({ type: 'response.create' });
    this.setState('thinking');
  }

  cancelResponse(): void {
    if (this.dataChannel?.readyState !== 'open') return;

    if (this.options.providerResponder) {
      this.abortProviderTurns();
      this.queuedProviderSpeech = null;
      this.performProviderCancellation(this.providerLiveState.cancelSpeech());
      this.setState('listening');
      return;
    }

    this.sendEvent({ type: 'response.cancel' });
    this.setState('listening');
  }

  async resumeAudio(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (this.currentAudioElement?.paused) {
      await this.currentAudioElement.play();
    }
  }

  end(): void {
    this.ended = true;
    this.dispose('ended');
  }

  private installPeerConnectionHandlers(peerConnection: RTCPeerConnection): void {
    peerConnection.addEventListener('track', (event) => {
      if (this.ended) return;
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.currentRemoteStream = stream;

      const audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      audioElement.setAttribute('playsinline', '');
      audioElement.srcObject = stream;
      this.currentAudioElement?.pause();
      this.currentAudioElement = audioElement;
      this.options.callbacks?.onRemoteStream?.(stream, audioElement);
      this.startAudioLevelMeter(stream);

      void audioElement.play().catch(() => {
        if (this.ended) return;
        this.options.callbacks?.onError?.(
          new RealtimeVoiceError('Tap the audio control to hear the live tutor.', {
            code: 'autoplay-blocked',
            recoverable: true,
          }),
        );
      });
    });

    peerConnection.addEventListener('connectionstatechange', () => {
      if (this.ended) return;
      if (peerConnection.connectionState === 'failed') {
        const error = new RealtimeVoiceError('The live voice connection was lost.', {
          code: 'connection-failed',
          recoverable: true,
        });
        this.fail(error);
      }
    });
  }

  private installDataChannelHandlers(dataChannel: RTCDataChannel): void {
    this.dataChannelMessageHandler = (event) => {
      if (this.ended) return;
      if (typeof event.data !== 'string') return;
      let payload: unknown;
      try {
        payload = JSON.parse(event.data) as unknown;
      } catch {
        this.options.callbacks?.onError?.(
          new RealtimeVoiceError('The live tutor sent an unreadable event.', {
            code: 'protocol-error',
            recoverable: true,
          }),
        );
        return;
      }

      if (!isRecord(payload) || typeof payload.type !== 'string') return;
      this.handleServerEvent(payload as RealtimeServerEvent);
    };

    this.dataChannelCloseHandler = () => {
      if (this.ended || this.currentState === 'ended' || this.currentState === 'error') return;
      const error = new RealtimeVoiceError('The live tutor channel closed unexpectedly.', {
        code: 'channel-closed',
        recoverable: true,
      });
      this.fail(error);
    };

    dataChannel.addEventListener('message', this.dataChannelMessageHandler);
    dataChannel.addEventListener('close', this.dataChannelCloseHandler);
  }

  private waitForDataChannelOpen(dataChannel: RTCDataChannel): Promise<void> {
    if (dataChannel.readyState === 'open') return Promise.resolve();
    if (dataChannel.readyState === 'closing' || dataChannel.readyState === 'closed') {
      return Promise.reject(
        new RealtimeVoiceError('The live tutor channel closed while connecting.', {
          code: 'channel-closed',
          recoverable: true,
        }),
      );
    }

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(
          new RealtimeVoiceError('The live tutor took too long to connect.', {
            code: 'connection-failed',
            recoverable: true,
          }),
        );
      }, CHANNEL_OPEN_TIMEOUT_MS);

      const handleOpen = () => {
        cleanup();
        resolve();
      };
      const handleClose = () => {
        cleanup();
        reject(
          new RealtimeVoiceError('The live tutor channel closed while connecting.', {
            code: 'channel-closed',
            recoverable: true,
          }),
        );
      };
      const cleanup = () => {
        window.clearTimeout(timeoutId);
        dataChannel.removeEventListener('open', handleOpen);
        dataChannel.removeEventListener('close', handleClose);
      };

      dataChannel.addEventListener('open', handleOpen, { once: true });
      dataChannel.addEventListener('close', handleClose, { once: true });
    });
  }

  private handleServerEvent(event: RealtimeServerEvent): void {
    if (this.ended) return;
    const usesProvider = Boolean(this.options.providerResponder);
    const providerTurn = this.options.providerResponder
      ? readFinalProviderTutorTurn(event)
      : undefined;

    switch (event.type) {
      case 'input_audio_buffer.speech_started': {
        this.abortProviderTurns();
        if (usesProvider) {
          this.queuedProviderSpeech = null;
          this.performProviderCancellation(
            this.providerLiveState.noteSpeechStarted(event.item_id),
          );
        }
        this.setState('listening');
        break;
      }
      case 'input_audio_buffer.speech_stopped':
        if (usesProvider) this.providerLiveState.noteSpeechStopped(event.item_id);
        this.setState('thinking');
        break;
      case 'response.created': {
        if (!usesProvider) {
          this.setState('thinking');
          break;
        }

        const identity = readProviderTutorResponseIdentity(event);
        if (!identity) break;
        const result = this.providerLiveState.noteResponseCreated(identity);
        if (result.cancelResponseId && this.dataChannel?.readyState === 'open') {
          this.providerCancellationBarriers.set(
            identity.turnId,
            result.cancelResponseId,
          );
          this.sendProviderCancellationEvents(
            identity.turnId,
            result.cancelResponseId,
            true,
            true,
          );
        }
        if (result.accepted) this.setState('thinking');
        break;
      }
      case 'output_audio_buffer.started':
        if (
          !usesProvider ||
          this.providerLiveState.noteOutputStarted(event.response_id)
        ) {
          this.setState('speaking');
        }
        break;
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        if (
          !usesProvider ||
          this.providerLiveState.noteOutputStarted(event.response_id)
        ) {
          this.setState('speaking');
        }
        break;
      case 'output_audio_buffer.stopped': {
        if (!usesProvider) {
          this.setState('listening');
          break;
        }
        if (this.releaseProviderCancellationBarrier(event.response_id)) {
          if (!this.flushQueuedProviderSpeech()) this.setState('listening');
          break;
        }

        const delivered = this.providerLiveState.finishOutput(event.response_id);
        if (delivered) {
          this.options.callbacks?.onProviderAnswerDelivered?.(delivered);
          this.setState('listening');
        }
        break;
      }
      case 'output_audio_buffer.cleared':
        if (!usesProvider) {
          this.setState('listening');
          break;
        }
        if (this.releaseProviderCancellationBarrier(event.response_id)) {
          if (!this.flushQueuedProviderSpeech()) this.setState('listening');
        } else if (this.providerLiveState.discardOutput(event.response_id)) {
          this.setState('listening');
        }
        break;
      case 'response.done': {
        if (!usesProvider) {
          this.setState('listening');
          break;
        }

        const identity = readProviderTutorResponseIdentity(event);
        if (!identity) break;
        const result = this.providerLiveState.noteResponseDone(identity);
        if (result.accepted && result.terminal) {
          const waitingForClear = this.performProviderCancellation(
            this.providerLiveState.cancelSpeech(),
          );
          if (!waitingForClear) this.setState('listening');
        }
        break;
      }
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        if (!usesProvider) {
          this.updateTranscript(event, 'assistant', readTranscriptText(event.delta), false);
          this.setState('speaking');
        } else if (this.providerLiveState.noteOutputStarted(event.response_id)) {
          this.setState('speaking');
        }
        break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        if (!usesProvider) {
          this.updateTranscript(event, 'assistant', readTranscriptText(event.transcript), true);
        }
        break;
      case 'conversation.item.input_audio_transcription.delta':
        this.updateTranscript(event, 'user', readTranscriptText(event.delta), false);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.updateTranscript(event, 'user', readTranscriptText(event.transcript), true);
        if (usesProvider) {
          if (providerTurn && this.providerLiveState.takeFinalTurn(providerTurn)) {
            void this.handleProviderTutorTurn(providerTurn);
          } else if (!providerTurn && this.providerLiveState.finishEmptyTurn(event.item_id)) {
            this.setState('listening');
          }
        }
        break;
      case 'conversation.item.input_audio_transcription.failed':
        if (usesProvider && this.providerLiveState.finishEmptyTurn(event.item_id)) {
          this.options.callbacks?.onError?.(
            new RealtimeVoiceError(
              'The learner audio could not be transcribed. Please repeat that turn.',
              { code: 'transcription-failed', recoverable: true },
            ),
          );
          this.setState('listening');
        }
        break;
      case 'error': {
        if (usesProvider) {
          const errorContext = readProviderTutorErrorContext(event);
          if (
            errorContext &&
            this.providerCancellationBarriers.has(errorContext.turnId)
          ) {
            if (errorContext.operation === 'clear') {
              this.fail(
                new RealtimeVoiceError(
                  'The interrupted tutor audio could not be cleared safely. Start a new live session.',
                  { code: 'protocol-error', recoverable: true },
                ),
              );
              return;
            }
            if (errorContext.operation === 'speak') {
              this.providerLiveState.forgetCancelledTurn(errorContext.turnId);
              this.providerCancellationBarriers.delete(errorContext.turnId);
              if (!this.flushQueuedProviderSpeech()) this.setState('listening');
            }
            break;
          }
          if (errorContext) {
            const affectedCurrentSpeech =
              this.providerLiveState.failSpeech(errorContext.turnId);
            if (!affectedCurrentSpeech) break;
            this.setState('listening');
          }
        }
        const error = new RealtimeVoiceError(readServerError(event), {
          code: 'protocol-error',
          recoverable: true,
        });
        this.options.callbacks?.onError?.(error);
        break;
      }
    }
  }

  private async handleProviderTutorTurn(turn: ProviderTutorTurn): Promise<void> {
    const responder = this.options.providerResponder;
    if (
      !responder ||
      this.ended ||
      this.handledProviderTurnIds.has(turn.id)
    ) {
      return;
    }

    this.handledProviderTurnIds.add(turn.id);
    this.abortProviderTurns(turn.id);
    const controller = new AbortController();
    this.providerTurnControllers.set(turn.id, controller);
    this.setState('thinking');

    try {
      const answer = await responder({
        id: turn.id,
        text: turn.text,
        signal: controller.signal,
      });
      if (controller.signal.aborted || this.ended) return;

      const speechEvent = createProviderTutorSpeechResponseEvent(turn.id, answer);
      const normalizedAnswer = answer.trim().slice(0, 6_000);
      this.queueProviderSpeech({
        turnId: turn.id,
        answer: normalizedAnswer,
        event: speechEvent,
      });
      this.options.callbacks?.onTranscript?.({
        id: `provider-${turn.id}`,
        role: 'assistant',
        text: normalizedAnswer,
        isFinal: true,
      });
    } catch (error) {
      if (!controller.signal.aborted && !this.ended) {
        this.providerLiveState.failSpeech(turn.id);
        this.options.callbacks?.onError?.(
          new RealtimeVoiceError(
            sanitizeMessage(
              error instanceof Error ? error.message : undefined,
              'The selected tutor could not answer this live turn.',
            ),
            { code: 'provider-error', recoverable: true },
          ),
        );
        this.setState('listening');
      }
    } finally {
      this.providerTurnControllers.delete(turn.id);
    }
  }

  private abortProviderTurns(exceptTurnId?: string): void {
    for (const [turnId, controller] of this.providerTurnControllers) {
      if (turnId !== exceptTurnId) controller.abort();
    }
  }

  private queueProviderSpeech(speech: QueuedProviderSpeech): void {
    this.performProviderCancellation(this.providerLiveState.cancelSpeech());
    this.queuedProviderSpeech = speech;
    if (!this.flushQueuedProviderSpeech()) this.setState('thinking');
  }

  private flushQueuedProviderSpeech(): boolean {
    if (
      !this.queuedProviderSpeech ||
      this.providerCancellationBarriers.size > 0 ||
      this.ended ||
      this.dataChannel?.readyState !== 'open'
    ) {
      return false;
    }

    const speech = this.queuedProviderSpeech;
    const previous = this.providerLiveState.startSpeech(
      speech.turnId,
      speech.answer,
    );
    if (previous) {
      this.providerLiveState.failSpeech(speech.turnId);
      this.performProviderCancellation(previous);
      return false;
    }

    try {
      this.sendEvent(speech.event);
      this.queuedProviderSpeech = null;
      this.setState('thinking');
      return true;
    } catch {
      this.providerLiveState.failSpeech(speech.turnId);
      this.queuedProviderSpeech = null;
      this.options.callbacks?.onError?.(
        new RealtimeVoiceError(
          'The selected tutor answer could not be sent to the live speech service.',
          { code: 'protocol-error', recoverable: true },
        ),
      );
      this.setState('listening');
      return false;
    }
  }

  private performProviderCancellation(
    cancellation: ProviderSpeechCancellation | undefined,
  ): boolean {
    if (!cancellation) return false;

    const needsBarrier =
      !cancellation.responseId || cancellation.shouldClearOutput;
    if (needsBarrier) {
      this.providerCancellationBarriers.set(
        cancellation.turnId,
        cancellation.responseId,
      );
    }
    if (!cancellation.responseId || this.dataChannel?.readyState !== 'open') {
      return needsBarrier;
    }

    this.sendProviderCancellationEvents(
      cancellation.turnId,
      cancellation.responseId,
      cancellation.shouldCancelResponse,
      cancellation.shouldClearOutput,
    );
    return needsBarrier;
  }

  private sendProviderCancellationEvents(
    turnId: string,
    responseId: string,
    shouldCancelResponse: boolean,
    shouldClearOutput: boolean,
  ): void {
    if (shouldCancelResponse) {
      this.sendEvent({
        event_id: `cancel_${turnId}`,
        type: 'response.cancel',
        response_id: responseId,
      });
    }
    if (shouldClearOutput) {
      this.sendEvent({
        event_id: `clear_${turnId}`,
        type: 'output_audio_buffer.clear',
      });
    }
  }

  private releaseProviderCancellationBarrier(responseId: unknown): boolean {
    if (typeof responseId !== 'string') return false;
    for (const [turnId, barrierResponseId] of this.providerCancellationBarriers) {
      if (barrierResponseId === responseId) {
        this.providerCancellationBarriers.delete(turnId);
        return true;
      }
    }
    return false;
  }

  private updateTranscript(
    event: RealtimeServerEvent,
    role: RealtimeTranscript['role'],
    value: string | undefined,
    isFinal: boolean,
  ): void {
    const key = transcriptKey(event, role);
    const existing = this.transcriptBuffers.get(key) ?? '';
    const text = isFinal && value ? value : `${existing}${value ?? ''}`;
    if (!text.trim()) return;

    if (isFinal) {
      this.transcriptBuffers.delete(key);
    } else {
      this.transcriptBuffers.set(key, text);
    }

    this.options.callbacks?.onTranscript?.({
      id: transcriptId(key),
      role,
      text: text.trim(),
      isFinal,
    });
  }

  private sendEvent(event: object): void {
    if (this.dataChannel?.readyState !== 'open') {
      throw new RealtimeVoiceError('The live voice session is not connected.', {
        code: 'channel-closed',
        recoverable: true,
      });
    }
    this.dataChannel.send(JSON.stringify(event));
  }

  private startAudioLevelMeter(stream: MediaStream): void {
    this.stopAudioLevelMeter();

    try {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;

      const context = new AudioContextConstructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      context.createMediaStreamSource(stream).connect(analyser);
      this.audioContext = context;
      this.analyser = analyser;
      this.lastAudioLevelEmitAt = 0;
      this.lastEmittedAudioLevel = 0;
      this.smoothedAudioLevel = 0;
      const samples = new Uint8Array(new ArrayBuffer(analyser.fftSize));

      const measure = () => {
        if (!this.analyser || this.ended) return;
        this.analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rootMeanSquare = Math.sqrt(sumSquares / samples.length);
        const rawAudioLevel = Math.min(1, rootMeanSquare * 4);
        const smoothingFactor = rawAudioLevel > this.smoothedAudioLevel ? 0.58 : 0.24;
        this.smoothedAudioLevel +=
          (rawAudioLevel - this.smoothedAudioLevel) * smoothingFactor;
        if (this.smoothedAudioLevel < 0.008) this.smoothedAudioLevel = 0;

        const now = window.performance.now();
        if (
          now - this.lastAudioLevelEmitAt >= AUDIO_LEVEL_EMIT_INTERVAL_MS &&
          (Math.abs(this.smoothedAudioLevel - this.lastEmittedAudioLevel) >=
            AUDIO_LEVEL_DEADBAND ||
            this.smoothedAudioLevel === 0)
        ) {
          this.lastAudioLevelEmitAt = now;
          this.lastEmittedAudioLevel = this.smoothedAudioLevel;
          this.options.callbacks?.onAudioLevel?.(this.smoothedAudioLevel);
        }
        this.animationFrame = window.requestAnimationFrame(measure);
      };

      this.animationFrame = window.requestAnimationFrame(measure);
    } catch {
      // Audio playback and state-driven avatar animation remain available without metering.
    }
  }

  private stopAudioLevelMeter(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.analyser?.disconnect();
    this.analyser = null;
    if (this.audioContext) {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.lastAudioLevelEmitAt = 0;
    this.lastEmittedAudioLevel = 0;
    this.smoothedAudioLevel = 0;
    this.options.callbacks?.onAudioLevel?.(0);
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
    if (this.terminalError || this.ended) return;
    this.terminalError = error;
    this.options.callbacks?.onError?.(error);
    this.dispose('error');
  }

  private dispose(finalState: 'ended' | 'error'): void {
    this.ended = true;
    this.removePageLifecycleHandlers();
    this.abortController?.abort();
    this.abortController = null;
    this.abortProviderTurns();
    this.providerTurnControllers.clear();
    this.providerLiveState.reset();
    this.providerCancellationBarriers.clear();
    this.queuedProviderSpeech = null;
    this.stopAudioLevelMeter();

    if (this.dataChannel) {
      if (this.dataChannelMessageHandler) {
        this.dataChannel.removeEventListener('message', this.dataChannelMessageHandler);
      }
      if (this.dataChannelCloseHandler) {
        this.dataChannel.removeEventListener('close', this.dataChannelCloseHandler);
      }
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.dataChannelMessageHandler = null;
    this.dataChannelCloseHandler = null;

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    for (const track of this.localStream?.getTracks() ?? []) track.stop();
    for (const track of this.currentRemoteStream?.getTracks() ?? []) track.stop();
    this.localStream = null;
    this.currentRemoteStream = null;

    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.srcObject = null;
      this.currentAudioElement.removeAttribute('src');
      this.currentAudioElement.load();
      this.currentAudioElement = null;
    }

    this.transcriptBuffers.clear();
    this.handledProviderTurnIds.clear();
    this.providerOpeningSequence = 0;
    this.setState(finalState);
  }
}

export function createRealtimeVoiceSession(options: RealtimeVoiceOptions = {}): RealtimeVoiceSession {
  if (options.providerResponder) {
    throw new RealtimeVoiceError(
      'Selected providers must use the local live voice transport.',
      { code: 'invalid-configuration', recoverable: true },
    );
  }
  return new WebRealtimeVoiceSession(options);
}
