export type RealtimeVoiceMode = 'tutor' | 'interview';

export type RealtimeVoiceState =
  | 'idle'
  | 'requesting-permission'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ended'
  | 'unavailable'
  | 'error';

export type RealtimeVoiceErrorCode =
  | 'unsupported'
  | 'microphone-denied'
  | 'microphone-unavailable'
  | 'invalid-configuration'
  | 'session-failed'
  | 'connection-failed'
  | 'channel-closed'
  | 'protocol-error'
  | 'transcription-failed'
  | 'provider-error'
  | 'autoplay-blocked'
  | 'aborted';

export interface RealtimeVoiceAvailability {
  supported: boolean;
  mode: 'realtime' | 'turn-based';
  reason?: string;
}

export interface RealtimeTranscript {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}

export interface RealtimeProviderTurn {
  id: string;
  text: string;
  signal: AbortSignal;
}

export type RealtimeProviderResponder = (
  turn: RealtimeProviderTurn,
) => Promise<string>;

export interface RealtimeProviderAnswer {
  id: string;
  text: string;
}

export interface RealtimeVoiceCallbacks {
  onStateChange?: (state: RealtimeVoiceState) => void;
  onTranscript?: (transcript: RealtimeTranscript) => void;
  onError?: (error: RealtimeVoiceError) => void;
  onRemoteStream?: (stream: MediaStream, audioElement: HTMLAudioElement) => void;
  onAudioLevel?: (level: number) => void;
  onSpeechBoundary?: () => void;
  onMutedChange?: (muted: boolean) => void;
  onProviderAnswerDelivered?: (answer: RealtimeProviderAnswer) => void;
}

export interface RealtimeVoiceOptions {
  /** A server-allowlisted OpenAI Realtime voice, such as `marin` or `cedar`. */
  voice?: string;
  mode?: RealtimeVoiceMode;
  /** Defaults to the same-origin `/api/voice/session` route. */
  sessionUrl?: string;
  /**
   * When provided, every live turn is routed through this responder before
   * Realtime speaks the returned answer. Provider credentials and URLs remain
   * inside the application and are never added to the Realtime session.
   */
  providerResponder?: RealtimeProviderResponder;
  callbacks?: RealtimeVoiceCallbacks;
  microphoneConstraints?: MediaTrackConstraints;
}

export interface RealtimeVoiceSession {
  readonly state: RealtimeVoiceState;
  readonly muted: boolean;
  readonly remoteStream: MediaStream | null;
  readonly audioElement: HTMLAudioElement | null;
  connect(): Promise<void>;
  setMuted(muted: boolean): void;
  sendText(text: string): void;
  cancelResponse(): void;
  resumeAudio(): Promise<void>;
  end(): void;
}

export class RealtimeVoiceError extends Error {
  readonly code: RealtimeVoiceErrorCode;
  readonly recoverable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: {
      code: RealtimeVoiceErrorCode;
      recoverable?: boolean;
      status?: number;
    },
  ) {
    super(message);
    this.name = 'RealtimeVoiceError';
    this.code = options.code;
    this.recoverable = options.recoverable ?? false;
    this.status = options.status;
  }
}
