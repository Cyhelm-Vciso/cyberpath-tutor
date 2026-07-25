import {
  RealtimeVoiceError,
  type RealtimeVoiceAvailability,
  type RealtimeVoiceSession,
  type RealtimeVoiceState,
} from './realtime-voice.types';
import type { LocalLiveVoiceOptions } from './local-live-voice.types';

export type { LocalLiveVoiceOptions } from './local-live-voice.types';

const UNSUPPORTED_REASON =
  'Local live voice requires a supported desktop browser with on-device speech recognition. This app will not fall back to OpenAI.';

export function getLocalLiveVoiceAvailability(): RealtimeVoiceAvailability {
  return {
    supported: false,
    mode: 'turn-based',
    reason: UNSUPPORTED_REASON,
  };
}

class UnsupportedLocalLiveVoiceSession implements RealtimeVoiceSession {
  private currentState: RealtimeVoiceState = 'idle';
  private isMuted = false;

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
    const error = new RealtimeVoiceError(UNSUPPORTED_REASON, {
      code: 'unsupported',
      recoverable: true,
    });
    this.setState('unavailable');
    this.options.callbacks?.onError?.(error);
    throw error;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.options.callbacks?.onMutedChange?.(muted);
  }

  sendText(): void {
    throw new RealtimeVoiceError(UNSUPPORTED_REASON, {
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

export function createLocalLiveVoiceSession(
  options: LocalLiveVoiceOptions,
): RealtimeVoiceSession {
  return new UnsupportedLocalLiveVoiceSession(options);
}
