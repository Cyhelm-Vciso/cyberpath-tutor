import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { type VoicePersona } from '@/domain/voice';

const TRANSCRIBE_PATH = '/api/voice/transcribe';
const MAX_TRANSCRIPT_LENGTH = 12_000;
const SPEECH_CHUNK_LENGTH = 700;
const SPEECH_PLAYBACK_MIN_TIMEOUT_MS = 15_000;
const SPEECH_PLAYBACK_MAX_TIMEOUT_MS = 90_000;
const VOICE_DISCOVERY_TIMEOUT_MS = 2_500;

interface TranscriptionPayload {
  text?: unknown;
  error?: unknown;
  message?: unknown;
}

function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function apiOrigin(): string | undefined {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.username || url.password || url.hash) return undefined;
      if (url.protocol !== 'https:' && !(isDevelopmentBuild() && url.protocol === 'http:')) return undefined;
      return url.origin;
    } catch {
      return undefined;
    }
  }

  if (Platform.OS === 'web') return '';
  if (!isDevelopmentBuild()) return undefined;

  const hostUri = Constants.expoConfig?.hostUri?.trim();
  if (!hostUri) return undefined;
  const candidate = /^https?:\/\//iu.test(hostUri) ? hostUri : `http://${hostUri}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

function transcriptionUrl(): string {
  const origin = apiOrigin();
  if (origin === '') return TRANSCRIBE_PATH;
  if (!origin) {
    throw new Error('Voice transcription needs a deployed app server. Set EXPO_PUBLIC_API_URL for native builds.');
  }
  return new URL(TRANSCRIBE_PATH, origin).toString();
}

function filenameForUri(uri: string): string {
  const clean = uri.split(/[?#]/u)[0];
  const match = clean.match(/\.([a-z0-9]{2,5})$/iu);
  return `cyberpath-voice.${match?.[1]?.toLowerCase() || (Platform.OS === 'web' ? 'webm' : 'm4a')}`;
}

function mimeForFilename(filename: string): string {
  if (filename.endsWith('.webm')) return 'audio/webm';
  if (filename.endsWith('.wav')) return 'audio/wav';
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.mp4')) return 'audio/mp4';
  return 'audio/m4a';
}

export async function transcribeRecording(uri: string, signal?: AbortSignal): Promise<string> {
  if (!uri.trim()) throw new Error('The recording could not be found. Please record your answer again.');

  const filename = filenameForUri(uri);
  const body = new FormData();

  if (Platform.OS === 'web') {
    const localResponse = await fetch(uri);
    const blob = await localResponse.blob();
    body.append('file', blob, filename);
  } else {
    body.append('file', {
      uri,
      name: filename,
      type: mimeForFilename(filename),
    } as unknown as Blob);
  }

  let response: Response;
  try {
    response = await fetch(transcriptionUrl(), {
      method: 'POST',
      body,
      signal,
      redirect: 'error',
      headers: { Accept: 'application/json' },
    });
  } catch {
    if (signal?.aborted) throw new Error('Voice transcription was canceled.');
    throw new Error('Could not reach the voice service. Check your connection and try again.');
  }

  const declaredLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declaredLength) && declaredLength > 100_000) {
    throw new Error('The voice service returned an unexpected response.');
  }

  let payload: TranscriptionPayload = {};
  try {
    payload = (await response.json()) as TranscriptionPayload;
  } catch {
    // Keep the status-based message below; never surface raw provider responses.
  }

  if (!response.ok) {
    if (response.status === 402) throw new Error('Voice service credits are not available for this project.');
    if (response.status === 413) throw new Error('That recording is too long. Keep each answer under one minute.');
    if (response.status === 429) throw new Error('The voice service is busy. Wait briefly and try again.');
    if (response.status === 401 || response.status === 403) throw new Error('The server could not access the voice service.');
    throw new Error('The voice service could not transcribe that recording. Please try again.');
  }

  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    throw new Error('No clear speech was detected. Try again closer to the microphone.');
  }

  return payload.text.trim().slice(0, MAX_TRANSCRIPT_LENGTH);
}

const personaVoiceHints: Record<VoicePersona['id'], RegExp> = {
  maya: /\b(ava|aria|hazel|jenny|karen|samantha|susan|victoria|zira|female|woman)\b/iu,
  daniel: /\b(alex|daniel|david|george|guy|james|mark|tom|male|man)\b/iu,
};

async function selectSystemVoice(
  persona: VoicePersona,
  signal?: AbortSignal,
): Promise<string | undefined> {
  if (signal?.aborted) return undefined;

  let discoveryTimeout: ReturnType<typeof setTimeout> | undefined;
  let abortDiscovery: (() => void) | undefined;
  try {
    const discoveryGuard = new Promise<never>((_, reject) => {
      const stopWaiting = () => reject(new Error('Voice discovery ended.'));
      discoveryTimeout = setTimeout(stopWaiting, VOICE_DISCOVERY_TIMEOUT_MS);
      abortDiscovery = stopWaiting;
      signal?.addEventListener('abort', stopWaiting, { once: true });
    });
    const voices = await Promise.race([
      Speech.getAvailableVoicesAsync(),
      discoveryGuard,
    ]);
    const english = voices.filter((voice) => /^en(?:-|$)/iu.test(voice.language));
    return english.find((voice) => personaVoiceHints[persona.id].test(`${voice.name} ${voice.identifier}`))?.identifier
      ?? english.find((voice) => voice.quality === 'Enhanced')?.identifier
      ?? english[0]?.identifier;
  } catch {
    return undefined;
  } finally {
    if (discoveryTimeout) clearTimeout(discoveryTimeout);
    if (abortDiscovery) signal?.removeEventListener('abort', abortDiscovery);
  }
}

function splitForSpeech(text: string): string[] {
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
    const boundary = Math.max(candidate.lastIndexOf('. '), candidate.lastIndexOf('? '), candidate.lastIndexOf('! '), candidate.lastIndexOf(' '));
    const splitAt = boundary > SPEECH_CHUNK_LENGTH * 0.55 ? boundary + 1 : SPEECH_CHUNK_LENGTH;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  return chunks;
}

export async function stopSystemSpeech(): Promise<void> {
  await Speech.stop().catch(() => undefined);
}

export async function speakTutorReply(
  text: string,
  persona: VoicePersona,
  callbacks: {
    onStart?: () => void;
    onDone?: () => void;
    onSpeechBoundary?: () => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const chunks = splitForSpeech(text);
  if (!chunks[0]) return;

  await stopSystemSpeech();
  const voice = await selectSystemVoice(persona, signal);
  if (signal?.aborted) {
    callbacks.onDone?.();
    return;
  }
  callbacks.onStart?.();

  const abort = () => void stopSystemSpeech();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (const chunk of chunks) {
      if (signal?.aborted) break;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let speechTimeout: ReturnType<typeof setTimeout> | undefined;
        const cleanup = () => {
          if (speechTimeout) clearTimeout(speechTimeout);
          signal?.removeEventListener('abort', abortChunk);
        };
        const finish = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };
        const fail = (message = 'Spoken playback is unavailable on this device. Captions remain available.') => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(message));
        };
        const abortChunk = () => finish();

        signal?.addEventListener('abort', abortChunk, { once: true });
        if (signal?.aborted) {
          finish();
          return;
        }

        const timeoutMs = Math.min(
          SPEECH_PLAYBACK_MAX_TIMEOUT_MS,
          Math.max(SPEECH_PLAYBACK_MIN_TIMEOUT_MS, chunk.length * 120),
        );
        speechTimeout = setTimeout(() => {
          fail('Spoken playback took too long. Captions remain available.');
          void stopSystemSpeech();
        }, timeoutMs);

        try {
          Speech.speak(chunk, {
            language: 'en-US',
            voice,
            pitch: persona.systemPitch,
            rate: 0.93,
            onBoundary: () => {
              if (!settled && !signal?.aborted) {
                callbacks.onSpeechBoundary?.();
              }
            },
            onDone: finish,
            onStopped: finish,
            onError: () => {
              if (signal?.aborted) finish();
              else fail();
            },
          });
        } catch {
          if (signal?.aborted) finish();
          else fail();
        }
      });
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    callbacks.onDone?.();
  }
}
