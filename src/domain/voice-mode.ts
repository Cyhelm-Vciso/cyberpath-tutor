import type { VoiceEnginePreference } from '@/domain/voice';

export type ResolvedVoiceEngine = 'realtime' | 'turn-based';
export type VoiceRuntimePlatform = 'web' | 'native';
export type LiveVoiceTransport = 'local-device' | 'openai-realtime';

export interface ResolveVoiceEngineInput {
  preference: VoiceEnginePreference;
  realtimeSupported: boolean;
  platform: VoiceRuntimePlatform;
  defaultToRealtime: boolean;
}

export function resolveLiveVoiceTransport(
  provider: 'custom' | 'openai',
): LiveVoiceTransport {
  return provider === 'custom' ? 'local-device' : 'openai-realtime';
}

/**
 * Provider selection may influence the backward-compatible `auto` default, but
 * it never blocks an explicit Realtime choice. A learner can use OpenAI
 * Realtime while keeping a custom/local provider selected for text tutoring
 * and turn-based voice.
 */
export function resolveVoiceEngine({
  preference,
  realtimeSupported,
  platform,
  defaultToRealtime,
}: ResolveVoiceEngineInput): ResolvedVoiceEngine {
  if (platform !== 'web') {
    return 'turn-based';
  }

  if (preference === 'realtime') return 'realtime';
  if (!realtimeSupported) return 'turn-based';
  if (preference === 'turn-based') return 'turn-based';
  return defaultToRealtime ? 'realtime' : 'turn-based';
}
