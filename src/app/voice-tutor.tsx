import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfessionalAvatar } from '@/components/tutor/professional-avatar';
import { IconButton, Pill } from '@/components/cyber/ui';
import { AppColors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { roles } from '@/data/curriculum';
import {
  getVoicePersona,
  VOICE_PERSONAS,
  type VoiceEnginePreference,
  type VoiceInteractionMode,
  type VoicePersonaId,
  type VoiceSessionState,
} from '@/domain/voice';
import {
  resolveLiveVoiceTransport,
  resolveVoiceEngine,
} from '@/domain/voice-mode';
import {
  getLocalLiveVoiceAvailability,
} from '@/services/local-live-voice';
import { createProviderAwareLiveVoiceSession } from '@/services/live-voice-router';
import {
  getRealtimeVoiceAvailability,
  type RealtimeProviderResponder,
  type RealtimeVoiceAvailability,
  type RealtimeVoiceCallbacks,
  type RealtimeTranscript,
  type RealtimeVoiceSession,
  type RealtimeVoiceState,
} from '@/services/realtime-voice';
import {
  BUILT_IN_OPENAI_AVAILABLE,
  getProviderPreset,
  getProviderSettings,
  type ProviderSettings,
} from '@/services/provider-settings';
import { sendTutorMessage, type TutorMessage } from '@/services/tutor';
import { speakTutorReply, stopSystemSpeech, transcribeRecording } from '@/services/voice-turn';
import {
  DEFAULT_VOICE_SETTINGS,
  getVoiceSettings,
  saveVoiceSettings,
  type VoiceSettings,
} from '@/services/voice-settings';
import { useApp } from '@/state/app-context';

interface CaptionLine {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final: boolean;
}

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const MAX_TURN_MS = 55_000;
const PUBLIC_PROVIDER_VOICE_TURNS_UNAVAILABLE =
  'Provider Voice Turns are unavailable on the public site because managed transcription is disabled.';

const stateLabels: Record<VoiceSessionState, string> = {
  idle: 'Ready when you are',
  connecting: 'Preparing voice',
  listening: 'Listening',
  thinking: 'Thinking through your answer',
  speaking: 'Tutor is speaking',
  muted: 'Microphone muted',
  error: 'Voice needs attention',
};

function mapRealtimeState(state: RealtimeVoiceState): VoiceSessionState {
  switch (state) {
    case 'requesting-permission':
    case 'connecting':
    case 'connected':
      return 'connecting';
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    case 'error':
    case 'unavailable':
      return 'error';
    default:
      return 'idle';
  }
}

function upsertCaption(lines: CaptionLine[], transcript: RealtimeTranscript): CaptionLine[] {
  const id = `${transcript.role}-${transcript.id}`;
  const next = lines.filter((line) => line.id !== id);
  next.push({ id, role: transcript.role, text: transcript.text, final: transcript.isFinal });
  return next.slice(-8);
}

export default function VoiceTutorScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: string; roleId?: string; prompt?: string }>();
  const { profile } = useApp();
  const [routeReady, setRouteReady] = useState(false);
  const interactionMode: VoiceInteractionMode = routeReady && params.mode === 'interview' ? 'interview' : 'tutor';
  const activeRole = roles.find((role) => role.id === ((routeReady ? params.roleId : undefined) ?? profile.primaryRoleId));
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [realtimeAvailability, setRealtimeAvailability] =
    useState<RealtimeVoiceAvailability>({
      supported: false,
      mode: 'turn-based',
      reason: 'Checking live voice availability.',
    });
  const [localLiveAvailability, setLocalLiveAvailability] =
    useState<RealtimeVoiceAvailability>({
      supported: false,
      mode: 'turn-based',
      reason: 'Checking on-device voice availability.',
    });
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>();
  const [providerLoaded, setProviderLoaded] = useState(false);
  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [error, setError] = useState<string>();
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>();
  const [speechCue, setSpeechCue] = useState(0);
  const [notice, setNotice] = useState(
    BUILT_IN_OPENAI_AVAILABLE
      ? 'Choose a tutor, then start a live session or record one answer at a time.'
      : 'Choose a tutor, then start Local Live Conversation. Provider Voice Turns are unavailable on this public site.',
  );
  const sessionRef = useRef<RealtimeVoiceSession | null>(null);
  const captionScrollRef = useRef<ScrollView | null>(null);
  const messageHistoryRef = useRef<TutorMessage[]>([]);
  const busyRef = useRef(false);
  const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechAbortRef = useRef<AbortController | null>(null);

  const persona = getVoicePersona(voiceSettings.personaId);
  const usesCustomProvider = providerSettings?.provider === 'custom';
  const selectedProviderPreset = usesCustomProvider
    ? getProviderPreset(providerSettings.custom.preset)
    : undefined;
  const usesLocalProvider = selectedProviderPreset?.category === 'local';
  const providerLabel = !providerLoaded
    ? 'Loading AI'
    : selectedProviderPreset?.shortLabel ?? 'OpenAI';
  const liveVoiceTransport = resolveLiveVoiceTransport(
    usesCustomProvider ? 'custom' : 'openai',
  );
  const liveAvailability =
    liveVoiceTransport === 'local-device'
      ? localLiveAvailability
      : realtimeAvailability;
  const liveVoiceSupported =
    Platform.OS === 'web' && liveAvailability.supported;
  const effectiveVoicePreference = BUILT_IN_OPENAI_AVAILABLE
    ? voiceSettings.engine
    : 'realtime';
  const resolvedVoiceEngine = resolveVoiceEngine({
    preference: effectiveVoicePreference,
    realtimeSupported: liveVoiceSupported,
    platform: Platform.OS === 'web' ? 'web' : 'native',
    defaultToRealtime:
      providerLoaded && providerSettings?.provider === 'openai',
  });
  const useRealtime =
    !BUILT_IN_OPENAI_AVAILABLE || resolvedVoiceEngine === 'realtime';
  const useTurnBased =
    BUILT_IN_OPENAI_AVAILABLE && resolvedVoiceEngine === 'turn-based';
  const engineSelectionLocked =
    !routeReady ||
    !providerLoaded ||
    realtimeActive ||
    recorderState.isRecording ||
    sessionState === 'connecting' ||
    sessionState === 'listening' ||
    sessionState === 'thinking' ||
    sessionState === 'speaking' ||
    sessionState === 'muted';
  const avatarSize = Math.min(254, Math.max(204, width - 112));

  useEffect(() => {
    Promise.all([
      getVoiceSettings(),
      Promise.resolve().then(() => getRealtimeVoiceAvailability()),
      Promise.resolve().then(() => getLocalLiveVoiceAvailability()),
    ])
      .then(([
        nextVoice,
        nextRealtimeAvailability,
        nextLocalLiveAvailability,
      ]) => {
        setVoiceSettings(nextVoice);
        setRealtimeAvailability(nextRealtimeAvailability);
        setLocalLiveAvailability(nextLocalLiveAvailability);
      })
      .catch(() => undefined)
      .finally(() => setRouteReady(true));

    return () => {
      sessionRef.current?.end();
      sessionRef.current = null;
      speechAbortRef.current?.abort();
      void stopSystemSpeech();
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
      if (recorder.isRecording) void recorder.stop();
    };
  }, [recorder]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setProviderLoaded(false);
      getProviderSettings()
        .then((nextSettings) => {
          if (active) {
            setProviderSettings(nextSettings);
            setProviderLoaded(true);
          }
        })
        .catch(() => {
          if (active) setProviderLoaded(true);
        });
      return () => {
        active = false;
        sessionRef.current?.end();
        sessionRef.current = null;
        speechAbortRef.current?.abort();
        void stopSystemSpeech();
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        turnTimeoutRef.current = null;
        if (recorder.isRecording) void recorder.stop();
        void setAudioModeAsync({
          allowsRecording: false,
          shouldPlayInBackground: false,
        });
        busyRef.current = false;
        setRealtimeActive(false);
        setMuted(false);
        setAudioLevel(undefined);
        setSessionState('idle');
      };
    }, [recorder]),
  );

  function addCaption(role: CaptionLine['role'], text: string) {
    setCaptions((current) => [...current, {
      id: `${role}-${Date.now()}-${current.length}`,
      role,
      text,
      final: true,
    }].slice(-8));
  }

  function realtimeOpeningPrompt(): string {
    const role = activeRole?.title ?? 'a cybersecurity career';
    if (routeReady && params.prompt?.trim()) return params.prompt.trim().slice(0, 2_000);
    return interactionMode === 'interview'
      ? `Begin a professional mock interview for ${role}. Briefly introduce the interview, then ask exactly one role-relevant question and wait for my answer.`
      : `Welcome me to a live tutoring session for ${role}. In two sentences explain how you can help, then ask what I want to practice first.`;
  }

  async function choosePersona(personaId: VoicePersonaId) {
    if (realtimeActive) endRealtime();
    const next = await saveVoiceSettings({ personaId });
    setVoiceSettings(next);
    setNotice(`${getVoicePersona(personaId).name} selected. Starting a new live session will use this voice.`);
  }

  async function chooseVoiceEngine(
    engine: Exclude<VoiceEnginePreference, 'auto'>,
  ) {
    if (engineSelectionLocked) return;

    if (engine === 'turn-based' && !BUILT_IN_OPENAI_AVAILABLE) {
      setError(PUBLIC_PROVIDER_VOICE_TURNS_UNAVAILABLE);
      return;
    }

    if (engine === 'realtime' && !liveVoiceSupported) {
      setError(
        liveAvailability.reason ??
          'Live conversation is unavailable in this browser.',
      );
      return;
    }

    const next = await saveVoiceSettings({ engine });
    setVoiceSettings(next);
    messageHistoryRef.current = [];
    setCaptions([]);
    setError(undefined);
    setNotice(
      engine === 'realtime'
        ? usesCustomProvider
          ? `${usesLocalProvider ? 'Local' : 'Device'} live conversation selected. On-device speech handles the microphone and voice; ${providerLabel} writes every answer. ${usesLocalProvider ? 'OpenAI is not used.' : 'Built-in OpenAI voice services are not used.'}`
          : 'Live conversation selected. OpenAI Realtime handles the spoken session with natural turn-taking and interruption.'
        : `Managed voice turns selected. Record one answer at a time and ${providerLabel} writes the reply.`,
    );
  }

  async function toggleCaptions() {
    const next = await saveVoiceSettings({ captions: !voiceSettings.captions });
    setVoiceSettings(next);
  }

  async function toggleSpokenReplies() {
    if (voiceSettings.speakReplies) {
      speechAbortRef.current?.abort();
      await stopSystemSpeech();
      setSessionState('idle');
    }
    const next = await saveVoiceSettings({ speakReplies: !voiceSettings.speakReplies });
    setVoiceSettings(next);
  }

  async function startRealtime() {
    if (!useRealtime || !liveVoiceSupported || busyRef.current) return;
    if (!providerLoaded || !providerSettings) {
      setError('The selected AI provider could not be loaded. Reopen AI settings and try again.');
      return;
    }
    busyRef.current = true;
    setError(undefined);
    setAudioLevel(undefined);
    setSessionState('connecting');
    setNotice(
      usesCustomProvider
        ? `Preparing on-device speech for ${providerLabel}. ${usesLocalProvider ? 'OpenAI is not used' : 'Built-in OpenAI voice services are not used'}; your microphone is active only during this session.`
        : 'OpenAI Realtime is starting the live spoken session. Your microphone is active only during the session, and this app does not store the audio.',
    );

    const callbacks: RealtimeVoiceCallbacks = {
      onStateChange: (state) => {
        setSessionState(mapRealtimeState(state));
        if (state === 'ended' || state === 'error' || state === 'unavailable') {
          setRealtimeActive(false);
          setMuted(false);
          setAudioLevel(undefined);
        }
      },
      onTranscript: (transcript) =>
        setCaptions((current) => upsertCaption(current, transcript)),
      onProviderAnswerDelivered: ({ text }) => {
        const assistantMessage: TutorMessage = {
          role: 'assistant',
          content: text,
        };
        messageHistoryRef.current = [
          ...messageHistoryRef.current,
          assistantMessage,
        ].slice(-20);
      },
      onAudioLevel: (level) => setAudioLevel(level),
      onSpeechBoundary: () => setSpeechCue((current) => current + 1),
      onMutedChange: setMuted,
      onError: (caught) => setError(caught.message),
    };
    const providerResponder: RealtimeProviderResponder = async ({
      text,
      signal,
    }) => {
      setError(undefined);
      const userMessage: TutorMessage = { role: 'user', content: text };
      const nextHistory = [
        ...messageHistoryRef.current,
        userMessage,
      ].slice(-20);
      messageHistoryRef.current = nextHistory;
      const result = await sendTutorMessage({
        messages: nextHistory,
        context: {
          role: activeRole?.title,
          level: profile.experience,
          goal: profile.goal,
          mode:
            interactionMode === 'interview'
              ? 'interview'
              : 'explain',
          channel: 'voice',
          spokenTurn: true,
          liveProviderRouting: true,
        },
        settings: providerSettings,
        signal,
      });
      if (signal.aborted) {
        throw new Error('The tutor request was canceled.');
      }
      return result.text;
    };
    const session = createProviderAwareLiveVoiceSession({
      provider: usesCustomProvider ? 'custom' : 'openai',
      local: {
            persona,
            providerResponder,
            callbacks,
      },
      openai: {
        voice: persona.realtimeVoice,
        mode: interactionMode,
        callbacks,
      },
    });
    sessionRef.current = session;

    try {
      await session.connect();
      setRealtimeActive(true);
      session.sendText(realtimeOpeningPrompt());
    } catch (caught) {
      sessionRef.current = null;
      setRealtimeActive(false);
      setSessionState('error');
      setError(caught instanceof Error ? caught.message : 'The live session could not start.');
    } finally {
      busyRef.current = false;
    }
  }

  function endRealtime() {
    sessionRef.current?.end();
    sessionRef.current = null;
    setRealtimeActive(false);
    setMuted(false);
    setAudioLevel(undefined);
    setSessionState('idle');
    setNotice('Live session ended. Your transcript stays on this screen until you close it.');
  }

  function toggleRealtimeMute() {
    const next = !muted;
    sessionRef.current?.setMuted(next);
    setMuted(next);
    setSessionState(next ? 'muted' : 'listening');
  }

  async function startTurnRecording() {
    if (!BUILT_IN_OPENAI_AVAILABLE) {
      setError(PUBLIC_PROVIDER_VOICE_TURNS_UNAVAILABLE);
      return;
    }
    if (busyRef.current || recorderState.isRecording) return;
    speechAbortRef.current?.abort();
    await stopSystemSpeech();
    setError(undefined);

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setSessionState('error');
      setError('Microphone access is off. Enable it in device settings, or return to the text tutor.');
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
        allowsBackgroundRecording: false,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSessionState('listening');
      setNotice('Recording now. Tap Finish answer when you are done. Maximum 55 seconds.');
      turnTimeoutRef.current = setTimeout(() => void finishTurnRecording(), MAX_TURN_MS + 250);
    } catch {
      setSessionState('error');
      setError('The microphone could not start. Check that another app is not using it.');
    }
  }

  async function finishTurnRecording() {
    if (busyRef.current || !recorder.isRecording) return;
    busyRef.current = true;
    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    turnTimeoutRef.current = null;
    setSessionState('thinking');
    setNotice('Transcribing your answer, then asking your selected language model.');

    try {
      const duration = recorder.currentTime;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, shouldPlayInBackground: false });
      if (duration < 0.35) throw new Error('That recording was too short. Hold the thought for a moment, then try again.');

      const uri = recorder.uri;
      if (!uri) throw new Error('The recording could not be saved. Please try again.');
      const transcript = await transcribeRecording(uri);
      addCaption('user', transcript);

      const userMessage: TutorMessage = { role: 'user', content: transcript };
      const nextHistory = [...messageHistoryRef.current, userMessage].slice(-20);
      messageHistoryRef.current = nextHistory;
      const result = await sendTutorMessage({
        messages: nextHistory,
        context: {
          role: activeRole?.title,
          level: profile.experience,
          goal: profile.goal,
          mode: interactionMode === 'interview' ? 'interview' : 'explain',
          channel: 'voice',
          spokenTurn: true,
        },
        settings: providerSettings,
      });
      const assistantMessage: TutorMessage = { role: 'assistant', content: result.text };
      messageHistoryRef.current = [...nextHistory, assistantMessage].slice(-20);
      addCaption('assistant', result.text);

      if (voiceSettings.speakReplies) {
        const controller = new AbortController();
        speechAbortRef.current = controller;
        await speakTutorReply(result.text, persona, {
          onStart: () => setSessionState('speaking'),
          onDone: () => setSessionState('idle'),
          onSpeechBoundary: () => setSpeechCue((current) => current + 1),
        }, controller.signal);
      } else {
        setSessionState('idle');
      }
      setNotice('Your turn. Record another answer when ready.');
    } catch (caught) {
      setSessionState('error');
      setError(caught instanceof Error ? caught.message : 'The tutor could not process that voice turn.');
    } finally {
      busyRef.current = false;
    }
  }

  async function stopTutorSpeech() {
    speechAbortRef.current?.abort();
    await stopSystemSpeech();
    setSessionState('idle');
  }

  function primaryTurnAction() {
    if (recorderState.isRecording) return void finishTurnRecording();
    if (sessionState === 'speaking') return void stopTutorSpeech();
    return void startTurnRecording();
  }

  const modeLabel = interactionMode === 'interview' ? 'Live interview' : 'Live tutor';
  const newestCaptions = captions.slice(-4);
  const captionBodyMaxHeight = Math.min(
    260,
    Math.max(120, Math.round(height * 0.25)),
  );
  const realtimeChoiceDetail = liveVoiceSupported
    ? usesCustomProvider
      ? `Hands-free · ${providerLabel} answers · on-device speech`
      : 'Hands-free · interrupt naturally · managed OpenAI Realtime'
    : Platform.OS === 'web'
      ? liveAvailability.reason ?? 'This browser does not support live voice.'
      : 'Available in the web app';
  const showsProviderAnswers =
    useRealtime && usesCustomProvider;
  const voiceFlowDisclosure =
    showsProviderAnswers
      ? `Data flow: microphone → on-device transcription → ${providerLabel} → device speech.\n${usesLocalProvider ? 'OpenAI is not used.' : 'Built-in OpenAI voice services are not used.'} Your transcript and tutor history are sent only to your configured ${providerLabel} URL.\nThe browser may install an English on-device speech pack once.`
      : useRealtime
        ? 'Live Conversation sends microphone audio and spoken replies through managed OpenAI Realtime.'
        : providerSettings?.provider === 'custom'
          ? `Managed speech-to-text transcribes each recording, the transcript is sent to ${providerLabel}, and this device speaks the reply.`
          : 'Managed speech-to-text transcribes each recording, OpenAI writes the reply, and this device speaks it.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <IconButton icon="chevron-down" label="Close live tutor" onPress={() => router.back()} />
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{modeLabel}</Text>
              <Text style={styles.title}>{activeRole?.title ?? 'Cybersecurity coaching'}</Text>
            </View>
            <IconButton icon="settings-outline" label="Open AI settings" onPress={() => router.push('/provider-settings')} />
          </View>

          <View style={styles.disclosure}>
            <Ionicons name="sparkles" size={15} color={AppColors.cyan} />
            <Text style={styles.disclosureText}>Photoreal AI tutor · speech-synced avatar and voice · verify important guidance</Text>
          </View>

          <View style={styles.personaRow}>
            {(Object.keys(VOICE_PERSONAS) as VoicePersonaId[]).map((personaId) => {
              const option = VOICE_PERSONAS[personaId];
              const selected = persona.id === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: engineSelectionLocked }}
                  accessibilityLabel={`${option.name}, ${option.presentation}`}
                  disabled={engineSelectionLocked}
                  onPress={() => void choosePersona(option.id)}
                  style={({ pressed }) => [styles.personaOption, selected && styles.personaSelected, engineSelectionLocked && !selected && styles.personaDisabled, pressed && styles.pressed]}>
                  <Ionicons name={selected ? 'checkmark-circle' : 'person-circle-outline'} size={19} color={selected ? AppColors.ink : AppColors.textMuted} />
                  <View>
                    <Text style={[styles.personaName, selected && styles.personaTextSelected]}>{option.name}</Text>
                    <Text style={[styles.personaVoice, selected && styles.personaTextSelected]}>{option.presentation}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.voiceModeSection}>
            <Text style={styles.voiceModeHeading}>VOICE EXPERIENCE</Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Voice experience"
              style={styles.voiceModeOptions}>
              <VoiceEngineOption
                title={
                  usesCustomProvider
                    ? `${providerLabel} ${usesLocalProvider ? 'local' : 'device'} live conversation`
                    : 'Live conversation'
                }
                detail={realtimeChoiceDetail}
                icon="radio"
                selected={useRealtime}
                disabled={!liveVoiceSupported || engineSelectionLocked}
                onPress={() => void chooseVoiceEngine('realtime')}
              />
              <VoiceEngineOption
                title={
                  !BUILT_IN_OPENAI_AVAILABLE
                    ? 'Provider Voice Turns · unavailable'
                    : usesCustomProvider
                    ? `${providerLabel} managed voice turns`
                    : 'Provider voice turns'
                }
                detail={
                  !BUILT_IN_OPENAI_AVAILABLE
                    ? 'Unavailable on public site · managed transcription is disabled'
                    : usesCustomProvider
                    ? `Managed transcription · ${providerLabel} writes each reply`
                    : `Tap to record · ${providerLabel} writes each reply`
                }
                icon="mic"
                selected={useTurnBased}
                disabled={!BUILT_IN_OPENAI_AVAILABLE || engineSelectionLocked}
                onPress={() => void chooseVoiceEngine('turn-based')}
              />
            </View>
            {providerLoaded ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.voiceModeDisclosure}>
                {voiceFlowDisclosure}
              </Text>
            ) : null}
            {realtimeActive ? (
              <Text style={styles.voiceModeDisclosure}>
                Session active · end the conversation to switch the voice experience or tutor voice.
              </Text>
            ) : null}
          </View>

          <View style={styles.stage}>
            <ProfessionalAvatar
              personaId={persona.id}
              state={sessionState}
              size={avatarSize}
              audioLevel={audioLevel}
              speechCue={speechCue}
            />
            <View style={styles.tutorIdentity}>
              <Text style={styles.tutorName}>{persona.name}</Text>
              <Text style={styles.tutorTitle}>{persona.title}</Text>
            </View>
            <View accessibilityLiveRegion="polite" style={styles.statusRow}>
              <View style={[styles.liveDot, sessionState === 'listening' && styles.liveDotListening]} />
              <Text style={styles.statusText}>{muted ? stateLabels.muted : stateLabels[sessionState]}</Text>
              {recorderState.isRecording ? <Text style={styles.timer}>{Math.ceil(recorderState.durationMillis / 1_000)}s</Text> : null}
            </View>
          </View>

          <View style={styles.modeStrip}>
            <Pill label={useRealtime ? 'Live conversation' : 'Voice turns'} tone="mint" icon={useRealtime ? 'radio' : 'mic'} />
            <Pill
              label={
                useRealtime && usesCustomProvider
                  ? `${providerLabel} + device voice`
                  : useRealtime
                    ? 'OpenAI Realtime'
                    : providerLabel
              }
              tone="blue"
              icon="hardware-chip"
            />
          </View>

          {voiceSettings.captions ? (
            <View testID="transcript-card" style={styles.captionCard} accessibilityLiveRegion="polite">
              <View style={styles.captionHeader}>
                <Text style={styles.captionTitle}>
                  {showsProviderAnswers
                    ? 'TRANSCRIPT & ANSWERS'
                    : 'LIVE CAPTIONS'}
                </Text>
                <Pressable accessibilityRole="button" accessibilityLabel={showsProviderAnswers ? 'Hide transcript and generated answers' : 'Hide captions'} onPress={() => void toggleCaptions()} hitSlop={10}>
                  <Ionicons name="close" size={18} color={AppColors.textMuted} />
                </Pressable>
              </View>
              <ScrollView
                ref={captionScrollRef}
                testID="transcript-scroll"
                style={[styles.captionScroll, { maxHeight: captionBodyMaxHeight }]}
                contentContainerStyle={styles.captionContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                onContentSizeChange={() =>
                  captionScrollRef.current?.scrollToEnd({ animated: false })
                }>
                {newestCaptions.length ? newestCaptions.map((line) => (
                  <View key={line.id} style={styles.captionLine}>
                    <Text style={[styles.captionRole, line.role === 'user' && styles.captionRoleUser]}>{line.role === 'user' ? 'YOU' : showsProviderAnswers ? 'ANSWER' : persona.name.toUpperCase()}</Text>
                    <Text style={styles.captionText}>{line.text}</Text>
                  </View>
                )) : <Text style={styles.emptyCaption}>Your conversation will appear here as you speak.</Text>}
              </ScrollView>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={showsProviderAnswers ? 'Show transcript and generated answers' : 'Show captions'} onPress={() => void toggleCaptions()} style={styles.restoreCaptions}>
              <Ionicons name="text" size={17} color={AppColors.mint} />
              <Text style={styles.restoreText}>{showsProviderAnswers ? 'Show transcript & answers' : 'Show captions'}</Text>
            </Pressable>
          )}

          {error ? (
            <View style={styles.errorCard} accessibilityLiveRegion="assertive">
              <Ionicons name="alert-circle" size={20} color={AppColors.amber} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : <Text style={styles.notice}>{notice}</Text>}

          {useRealtime ? (
            realtimeActive ? (
              <View testID="live-controls" style={styles.controls}>
                <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'} onPress={toggleRealtimeMute} style={({ pressed }) => [styles.roundControl, muted && styles.roundControlActive, pressed && styles.pressed]}>
                  <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={muted ? AppColors.ink : AppColors.text} />
                  <Text style={[styles.roundControlText, muted && styles.darkText]}>{muted ? 'Unmute' : 'Mute'}</Text>
                </Pressable>
                {sessionState === 'speaking' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Interrupt tutor" onPress={() => sessionRef.current?.cancelResponse()} style={({ pressed }) => [styles.interruptControl, pressed && styles.pressed]}>
                    <Ionicons name="hand-left" size={26} color={AppColors.ink} />
                    <Text style={styles.interruptText}>Interrupt</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel="End live session" onPress={endRealtime} style={({ pressed }) => [styles.roundControl, styles.endControl, pressed && styles.pressed]}>
                  <Ionicons name="call" size={24} color={AppColors.white} style={{ transform: [{ rotate: '135deg' }] }} />
                  <Text style={styles.roundControlText}>End</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable testID="live-controls" accessibilityRole="button" accessibilityLabel={usesCustomProvider ? `Start ${providerLabel} ${usesLocalProvider ? 'local' : 'device'} live conversation using on-device speech` : 'Start OpenAI live voice session'} onPress={() => void startRealtime()} disabled={sessionState === 'connecting' || !providerLoaded || !liveVoiceSupported} style={({ pressed }) => [styles.primaryControl, (!providerLoaded || !liveVoiceSupported || sessionState === 'connecting') && styles.disabled, pressed && styles.pressed]}>
                <Ionicons name="radio" size={25} color={AppColors.ink} />
                <View>
                  <Text style={styles.primaryControlText}>{!providerLoaded ? 'Loading AI provider…' : !liveVoiceSupported ? 'On-device live voice unavailable' : sessionState === 'connecting' ? 'Preparing voice…' : usesCustomProvider ? `Start ${usesLocalProvider ? 'local' : 'device'} live conversation` : 'Start live conversation'}</Text>
                  <Text style={styles.primaryControlHint}>{usesCustomProvider ? 'No built-in OpenAI voice · interrupt anytime' : 'Natural turn-taking · interrupt anytime'}</Text>
                </View>
              </Pressable>
            )
          ) : (
            <View style={styles.turnControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={recorderState.isRecording ? 'Finish voice answer' : sessionState === 'speaking' ? 'Stop tutor speech' : 'Record voice answer'}
                onPress={primaryTurnAction}
                disabled={sessionState === 'thinking'}
                style={({ pressed }) => [styles.primaryControl, recorderState.isRecording && styles.recordingControl, sessionState === 'thinking' && styles.disabled, pressed && styles.pressed]}>
                <Ionicons name={recorderState.isRecording ? 'stop' : sessionState === 'speaking' ? 'volume-mute' : 'mic'} size={25} color={AppColors.ink} />
                <View>
                  <Text style={styles.primaryControlText}>{recorderState.isRecording ? 'Finish answer' : sessionState === 'thinking' ? 'Preparing reply…' : sessionState === 'speaking' ? 'Stop tutor' : 'Tap to answer'}</Text>
                  <Text style={styles.primaryControlHint}>{recorderState.isRecording ? 'Microphone is on' : 'One managed voice turn at a time'}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: voiceSettings.speakReplies }} accessibilityLabel="Speak tutor replies" onPress={() => void toggleSpokenReplies()} style={styles.smallControl}>
                <Ionicons name={voiceSettings.speakReplies ? 'volume-high' : 'volume-mute'} size={20} color={AppColors.mint} />
                <Text style={styles.smallControlText}>{voiceSettings.speakReplies ? 'Voice on' : 'Voice off'}</Text>
              </Pressable>
            </View>
          )}

          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/tutor', params: { mode: interactionMode === 'interview' ? 'interview' : 'explain', roleId: activeRole?.id } })} style={styles.textFallback}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={AppColors.textMuted} />
            <Text style={styles.textFallbackText}>Continue with text tutor</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function VoiceEngineOption({
  title,
  detail,
  icon,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.voiceModeOption,
        selected && styles.voiceModeSelected,
        disabled && !selected && styles.voiceModeDisabled,
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.voiceModeIcon,
          selected && styles.voiceModeIconSelected,
        ]}>
        <Ionicons
          name={icon}
          size={20}
          color={selected ? AppColors.ink : AppColors.textMuted}
        />
      </View>
      <View style={styles.voiceModeCopy}>
        <Text
          style={[
            styles.voiceModeTitle,
            selected && styles.voiceModeTitleSelected,
          ]}>
          {title}
        </Text>
        <Text style={styles.voiceModeDetail}>{detail}</Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={selected ? AppColors.mint : AppColors.textDim}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.ink },
  page: { flexGrow: 1, alignItems: 'center' },
  shell: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: AppColors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  title: { color: AppColors.text, fontSize: 16, fontWeight: '900' },
  disclosure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: Spacing.md, backgroundColor: AppColors.panel, borderRadius: Radius.pill },
  disclosureText: { color: AppColors.textMuted, fontSize: 10, lineHeight: 14, flexShrink: 1 },
  personaRow: { flexDirection: 'row', gap: Spacing.sm },
  personaOption: { flex: 1, minHeight: 54, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: AppColors.inkElevated },
  personaSelected: { backgroundColor: AppColors.mint, borderColor: AppColors.mint },
  personaDisabled: { opacity: 0.48 },
  personaName: { color: AppColors.text, fontSize: 12, fontWeight: '900' },
  personaVoice: { color: AppColors.textDim, fontSize: 9, fontWeight: '700', marginTop: 1 },
  personaTextSelected: { color: AppColors.ink },
  voiceModeSection: { gap: Spacing.sm },
  voiceModeHeading: { color: AppColors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  voiceModeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  voiceModeOption: { flexGrow: 1, flexBasis: '46%', minWidth: 230, minHeight: 76, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  voiceModeSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  voiceModeDisabled: { opacity: 0.48 },
  voiceModeIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: AppColors.panel, alignItems: 'center', justifyContent: 'center' },
  voiceModeIconSelected: { backgroundColor: AppColors.mint },
  voiceModeCopy: { flex: 1, minWidth: 0 },
  voiceModeTitle: { color: AppColors.text, fontSize: 12, fontWeight: '900', marginBottom: 3 },
  voiceModeTitleSelected: { color: AppColors.mint },
  voiceModeDetail: { color: AppColors.textDim, fontSize: 9, lineHeight: 13 },
  voiceModeDisclosure: { color: AppColors.textDim, fontSize: 9, lineHeight: 14, textAlign: 'center', paddingHorizontal: Spacing.sm },
  stage: { alignItems: 'center', gap: 7, paddingTop: Spacing.sm },
  tutorIdentity: { alignItems: 'center' },
  tutorName: { color: AppColors.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
  tutorTitle: { color: AppColors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  statusRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: Radius.pill, backgroundColor: AppColors.panel, paddingHorizontal: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: AppColors.mint },
  liveDotListening: { backgroundColor: AppColors.cyan },
  statusText: { color: AppColors.text, fontSize: 10, fontWeight: '800' },
  timer: { color: AppColors.cyan, fontSize: 10, fontWeight: '900' },
  modeStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  captionCard: { minHeight: 116, overflow: 'hidden', borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated, padding: Spacing.md, gap: Spacing.sm },
  captionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  captionTitle: { flexShrink: 1, color: AppColors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  captionScroll: { minHeight: 60, flexGrow: 0 },
  captionContent: { flexGrow: 1, gap: Spacing.sm, paddingRight: 4 },
  captionLine: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  captionRole: { color: AppColors.mint, fontSize: 8, fontWeight: '900', width: 48, paddingTop: 3 },
  captionRoleUser: { color: AppColors.cyan },
  captionText: { flex: 1, minWidth: 0, color: AppColors.text, fontSize: 12, lineHeight: 17 },
  emptyCaption: { color: AppColors.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingTop: Spacing.lg },
  restoreCaptions: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.md },
  restoreText: { color: AppColors.mint, fontSize: 12, fontWeight: '800' },
  notice: { color: AppColors.textDim, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: Spacing.md },
  errorCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: '#2D281B', borderWidth: 1, borderColor: '#5C4A2B', borderRadius: Radius.md, padding: Spacing.md },
  errorText: { flex: 1, color: AppColors.text, fontSize: 11, lineHeight: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  roundControl: { width: 74, height: 64, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: AppColors.panel, borderWidth: 1, borderColor: AppColors.border },
  roundControlActive: { backgroundColor: AppColors.amber, borderColor: AppColors.amber },
  endControl: { backgroundColor: '#7A2C2D', borderColor: AppColors.red },
  roundControlText: { color: AppColors.text, fontSize: 10, fontWeight: '800' },
  darkText: { color: AppColors.ink },
  interruptControl: { minWidth: 112, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: AppColors.mint },
  interruptText: { color: AppColors.ink, fontSize: 11, fontWeight: '900' },
  turnControls: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
  primaryControl: { flex: 1, minHeight: 64, borderRadius: Radius.lg, backgroundColor: AppColors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  recordingControl: { backgroundColor: AppColors.amber },
  primaryControlText: { color: AppColors.ink, fontSize: 14, fontWeight: '900' },
  primaryControlHint: { color: '#15352E', fontSize: 9, fontWeight: '700', marginTop: 2 },
  smallControl: { minWidth: 82, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.panel, borderRadius: Radius.lg },
  smallControlText: { color: AppColors.textMuted, fontSize: 9, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  textFallback: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  textFallbackText: { color: AppColors.textMuted, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.992 }] },
});
