export const VOICE_PERSONA_IDS = ['maya', 'daniel'] as const;

export type VoicePersonaId = (typeof VOICE_PERSONA_IDS)[number];
export type VoiceInteractionMode = 'tutor' | 'interview';
export type VoiceEnginePreference = 'auto' | 'realtime' | 'turn-based';
export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'error';

export interface VoicePersona {
  id: VoicePersonaId;
  name: string;
  presentation: 'Female voice' | 'Male voice';
  title: string;
  realtimeVoice: 'marin' | 'cedar';
  systemPitch: number;
  summary: string;
}

export const VOICE_PERSONAS: Record<VoicePersonaId, VoicePersona> = {
  maya: {
    id: 'maya',
    name: 'Maya',
    presentation: 'Female voice',
    title: 'Security leadership coach',
    realtimeVoice: 'marin',
    systemPitch: 1.03,
    summary: 'Calm, direct coaching for leadership, risk, governance, and interviews.',
  },
  daniel: {
    id: 'daniel',
    name: 'Daniel',
    presentation: 'Male voice',
    title: 'Cybersecurity technical mentor',
    realtimeVoice: 'cedar',
    systemPitch: 0.94,
    summary: 'Practical technical coaching for operations, engineering, and response.',
  },
};

export function isVoicePersonaId(value: unknown): value is VoicePersonaId {
  return typeof value === 'string' && VOICE_PERSONA_IDS.includes(value as VoicePersonaId);
}

export function getVoicePersona(value: unknown): VoicePersona {
  return VOICE_PERSONAS[isVoicePersonaId(value) ? value : 'maya'];
}
