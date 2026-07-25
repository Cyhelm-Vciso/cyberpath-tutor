import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getVoicePersona,
  isVoicePersonaId,
  type VoiceEnginePreference,
  type VoicePersonaId,
} from '@/domain/voice';

const STORAGE_KEY = '@cyberpath/voice-settings-v1';

export interface VoiceSettings {
  personaId: VoicePersonaId;
  engine: VoiceEnginePreference;
  captions: boolean;
  speakReplies: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  personaId: 'maya',
  engine: 'auto',
  captions: true,
  speakReplies: true,
};

function isEngine(value: unknown): value is VoiceEnginePreference {
  return value === 'auto' || value === 'realtime' || value === 'turn-based';
}

export async function getVoiceSettings(): Promise<VoiceSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return {
      personaId: isVoicePersonaId(parsed.personaId) ? parsed.personaId : DEFAULT_VOICE_SETTINGS.personaId,
      engine: isEngine(parsed.engine) ? parsed.engine : DEFAULT_VOICE_SETTINGS.engine,
      captions: typeof parsed.captions === 'boolean' ? parsed.captions : DEFAULT_VOICE_SETTINGS.captions,
      speakReplies: typeof parsed.speakReplies === 'boolean' ? parsed.speakReplies : DEFAULT_VOICE_SETTINGS.speakReplies,
    };
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export async function saveVoiceSettings(input: Partial<VoiceSettings>): Promise<VoiceSettings> {
  const current = await getVoiceSettings();
  const next: VoiceSettings = {
    personaId: isVoicePersonaId(input.personaId) ? input.personaId : current.personaId,
    engine: isEngine(input.engine) ? input.engine : current.engine,
    captions: typeof input.captions === 'boolean' ? input.captions : current.captions,
    speakReplies: typeof input.speakReplies === 'boolean' ? input.speakReplies : current.speakReplies,
  };

  // Resolve once here so malformed future values cannot be persisted accidentally.
  getVoicePersona(next.personaId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
