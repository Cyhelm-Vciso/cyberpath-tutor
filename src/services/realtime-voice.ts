import {
  RealtimeVoiceError,
  type RealtimeVoiceAvailability,
  type RealtimeVoiceOptions,
  type RealtimeVoiceSession,
  type RealtimeVoiceState,
} from './realtime-voice.types';

export * from './realtime-voice.types';

const FALLBACK_REASON =
  'Live full-duplex voice is available in the web app. On this device, use the turn-based microphone mode instead.';

export function getRealtimeVoiceAvailability(): RealtimeVoiceAvailability {
  return {
    supported: false,
    mode: 'turn-based',
    reason: FALLBACK_REASON,
  };
}

class TurnBasedFallbackSession implements RealtimeVoiceSession {
  private currentState: RealtimeVoiceState = 'idle';
  private isMuted = false;

  constructor(private readonly options: RealtimeVoiceOptions) {}

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
    this.setState('unavailable');
    const error = new RealtimeVoiceError(FALLBACK_REASON, {
      code: 'unsupported',
      recoverable: true,
    });
    this.options.callbacks?.onError?.(error);
    throw error;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.options.callbacks?.onMutedChange?.(muted);
  }

  sendText(): void {
    throw new RealtimeVoiceError(FALLBACK_REASON, {
      code: 'unsupported',
      recoverable: true,
    });
  }

  cancelResponse(): void {}

  async resumeAudio(): Promise<void> {}

  end(): void {
    this.setState('ended');
  }

  private setState(state: RealtimeVoiceState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.options.callbacks?.onStateChange?.(state);
  }
}

export function createRealtimeVoiceSession(options: RealtimeVoiceOptions = {}): RealtimeVoiceSession {
  return new TurnBasedFallbackSession(options);
}
