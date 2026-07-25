import type { VoicePersona } from '@/domain/voice';

import type {
  RealtimeProviderResponder,
  RealtimeVoiceCallbacks,
} from './realtime-voice.types';

export interface LocalLiveVoiceOptions {
  persona: VoicePersona;
  providerResponder: RealtimeProviderResponder;
  callbacks?: RealtimeVoiceCallbacks;
  language?: string;
}
