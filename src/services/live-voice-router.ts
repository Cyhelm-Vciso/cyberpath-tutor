import {
  createLocalLiveVoiceSession,
  type LocalLiveVoiceOptions,
} from './local-live-voice';
import {
  createRealtimeVoiceSession,
  type RealtimeVoiceOptions,
  type RealtimeVoiceSession,
} from './realtime-voice';

interface LiveVoiceSessionFactories {
  local: (options: LocalLiveVoiceOptions) => RealtimeVoiceSession;
  openai: (options: RealtimeVoiceOptions) => RealtimeVoiceSession;
}

interface ProviderAwareLiveVoiceOptions {
  provider: 'custom' | 'openai';
  local: LocalLiveVoiceOptions;
  openai: RealtimeVoiceOptions;
}

const defaultFactories: LiveVoiceSessionFactories = {
  local: createLocalLiveVoiceSession,
  openai: createRealtimeVoiceSession,
};

export function createProviderAwareLiveVoiceSession(
  options: ProviderAwareLiveVoiceOptions,
  factories: LiveVoiceSessionFactories = defaultFactories,
): RealtimeVoiceSession {
  return options.provider === 'custom'
    ? factories.local(options.local)
    : factories.openai(options.openai);
}
