import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark, IconButton, Pill } from '@/components/cyber/ui';
import { AppColors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { roles } from '@/data/curriculum';
import { scenarios } from '@/data/scenarios';
import { getProviderPreset, getProviderSettings, ProviderSettings } from '@/services/provider-settings';
import { sendTutorMessage, TutorError, TutorMessage } from '@/services/tutor';
import { useApp } from '@/state/app-context';

interface DisplayMessage extends TutorMessage {
  id: string;
  error?: boolean;
}

const welcome: DisplayMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'I’m your CyberPath tutor. I can teach a concept, coach a decision, role-play a stakeholder, run an interview, or assess your answer. What would help most right now?',
};

export default function TutorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string; mode?: string; roleId?: string; scenarioId?: string }>();
  const { profile } = useApp();
  const [messages, setMessages] = useState<DisplayMessage[]>([welcome]);
  const [input, setInput] = useState(params.prompt ?? '');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ProviderSettings>();
  const [error, setError] = useState<string>();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const activeRole = roles.find((role) => role.id === (params.roleId ?? profile.primaryRoleId));
  const activeScenario = scenarios.find((scenario) => scenario.id === params.scenarioId);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getProviderSettings()
        .then((nextSettings) => {
          if (active) setSettings(nextSettings);
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timeout);
  }, [messages, loading]);

  async function send(text = input, appendUserMessage = true) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMessage: DisplayMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed };
    const nextMessages = appendUserMessage ? [...messages, userMessage] : messages;
    if (appendUserMessage) {
      setMessages(nextMessages);
      setInput('');
    }
    setError(undefined);
    setLoading(true);
    try {
      const result = await sendTutorMessage({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        context: {
          role: activeRole?.title,
          level: profile.experience,
          goal: profile.goal,
          mode: params.mode ?? 'explain',
          scenario: activeScenario ? JSON.stringify({
            title: activeScenario.title,
            learnerRole: roles.find((role) => role.id === activeScenario.primaryRoleId)?.title,
            setting: activeScenario.setting,
            knownBrief: activeScenario.learnerBrief,
            safetyNote: activeScenario.safetyNote,
          }) : undefined,
        },
        settings,
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.text }]);
      if (settings?.provider !== result.provider) setSettings(await getProviderSettings());
    } catch (caught) {
      const message = caught instanceof TutorError ? caught.message : 'The tutor could not respond. Your message is still here—try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <IconButton icon="chevron-down" label="Close tutor" onPress={() => router.back()} />
            <View style={styles.headerIdentity}>
              <BrandMark compact />
              <View>
                <Text style={styles.headerTitle}>CyberPath Tutor</Text>
                <Text style={styles.headerStatus}>{params.mode ? `${params.mode} mode` : 'Adaptive coaching'}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open AI provider settings" onPress={() => router.push('/provider-settings')}>
              <Pill
                label={
                  settings?.provider === 'custom'
                    ? getProviderPreset(settings.custom.preset).shortLabel
                    : 'OpenAI'
                }
                tone="mint"
                icon="hardware-chip"
              />
            </Pressable>
          </View>

          <View style={styles.contextStrip}>
            <Ionicons name="locate" size={15} color={AppColors.mint} />
            <Text style={styles.contextText} numberOfLines={1}>
              {activeScenario ? `${activeScenario.title} · ${activeRole?.title ?? 'Role-play'}` : activeRole ? `Path: ${activeRole.title}` : 'Career exploration'}
            </Text>
            <Text style={styles.contextSafe}>SAFE LAB</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.notice}>
              <Ionicons name="sparkles" size={16} color={AppColors.cyan} />
              <Text style={styles.noticeText}>AI guidance can be wrong. Validate important technical, legal, and regulatory details.</Text>
            </View>
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {loading ? (
              <View style={styles.typingRow}>
                <View style={styles.tutorAvatar}><Ionicons name="sparkles" size={16} color={AppColors.ink} /></View>
                <View style={styles.typingBubble}><ActivityIndicator size="small" color={AppColors.mint} /><Text style={styles.typingText}>Thinking through the evidence…</Text></View>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={AppColors.amber} />
                <View style={styles.flex}>
                  <Text style={styles.errorTitle}>Tutor unavailable</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Retry tutor message" onPress={() => send(messages.at(-1)?.role === 'user' ? messages.at(-1)!.content : input, false)}><Text style={styles.retry}>Retry</Text></Pressable>
              </View>
            ) : null}
          </ScrollView>

          {messages.length <= 1 ? (
            <ScrollView
              horizontal
              style={styles.quickActionsScroll}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActions}
              keyboardShouldPersistTaps="handled">
              {['Explain simply', 'Show workplace context', 'Quiz me', 'Role-play a manager'].map((action) => (
                <Pressable key={action} accessibilityRole="button" accessibilityLabel={action} onPress={() => { setInput(action); inputRef.current?.focus(); }} style={styles.quickAction}>
                  <Text style={styles.quickActionText}>{action}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.composer}>
            <Pressable
              onPress={() => router.push({
                pathname: '/voice-tutor',
                params: {
                  mode: params.mode === 'interview' ? 'interview' : 'tutor',
                  roleId: activeRole?.id,
                  prompt: input.trim() || undefined,
                },
              })}
              accessibilityRole="button"
              accessibilityLabel={params.mode === 'interview' ? 'Start voice interview' : 'Start live voice tutor'}
              style={({ pressed }) => [styles.voiceButton, pressed && styles.pressed]}>
              <Ionicons name="mic" size={20} color={AppColors.mint} />
            </Pressable>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              editable={!loading}
              multiline
              maxLength={12000}
              placeholder="Ask, decide, or explain your reasoning…"
              placeholderTextColor={AppColors.textDim}
              style={styles.input}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => send()}
              accessibilityLabel="Message the tutor"
            />
            <Pressable
              onPress={() => send()}
              disabled={!input.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={({ pressed }) => [styles.send, (!input.trim() || loading) && styles.sendDisabled, pressed && styles.pressed]}>
              <Ionicons name="arrow-up" size={21} color={AppColors.ink} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const assistant = message.role === 'assistant';
  return (
    <View style={[styles.messageRow, !assistant && styles.messageRowUser]}>
      {assistant ? <View style={styles.tutorAvatar}><Ionicons name="sparkles" size={16} color={AppColors.ink} /></View> : null}
      <View style={[styles.bubble, assistant ? styles.assistantBubble : styles.userBubble]}>
        {assistant ? <Text style={styles.messageLabel}>CYBERPATH TUTOR</Text> : null}
        <Text style={[styles.messageText, !assistant && styles.userMessageText]}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.ink },
  flex: { flex: 1 },
  shell: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  headerIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { color: AppColors.text, fontSize: 14, fontWeight: '900' },
  headerStatus: { color: AppColors.mint, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  contextStrip: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#0D2928', paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  contextText: { color: AppColors.textMuted, fontSize: 10, fontWeight: '700', flex: 1 },
  contextSafe: { color: AppColors.mint, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  chat: { flex: 1 },
  chatContent: { padding: Spacing.lg, gap: Spacing.lg },
  notice: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: AppColors.panel, borderRadius: Radius.md },
  noticeText: { color: AppColors.textDim, fontSize: 10, lineHeight: 15, flex: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, maxWidth: '91%' },
  messageRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  tutorAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center' },
  bubble: { minWidth: 0, flexShrink: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  assistantBubble: { backgroundColor: AppColors.inkElevated, borderWidth: 1, borderColor: AppColors.border, borderBottomLeftRadius: 5 },
  userBubble: { backgroundColor: AppColors.mint, borderBottomRightRadius: 5 },
  messageLabel: { color: AppColors.mint, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  messageText: { color: AppColors.text, fontSize: 14, lineHeight: 21 },
  userMessageText: { color: AppColors.ink, fontWeight: '600' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: AppColors.inkElevated, borderRadius: Radius.lg, padding: Spacing.md },
  typingText: { color: AppColors.textMuted, fontSize: 11 },
  errorCard: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: '#2D281B', borderWidth: 1, borderColor: '#5C4A2B', borderRadius: Radius.md, padding: Spacing.md },
  errorTitle: { color: AppColors.text, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  errorText: { color: AppColors.textMuted, fontSize: 10, lineHeight: 15 },
  retry: { color: AppColors.amber, fontSize: 11, fontWeight: '900' },
  quickActionsScroll: { flexGrow: 0, flexShrink: 0 },
  quickActions: { alignItems: 'center', gap: 7, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  quickAction: { minHeight: 44, justifyContent: 'center', backgroundColor: AppColors.panel, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  quickActionText: { color: AppColors.textMuted, fontSize: 10, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, padding: 7, borderWidth: 1, borderColor: AppColors.borderBright, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated },
  voiceButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: AppColors.mintDark, borderWidth: 1, borderColor: AppColors.borderBright, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 42, maxHeight: 126, color: AppColors.text, fontSize: 14, lineHeight: 20, paddingHorizontal: Spacing.sm, paddingVertical: 10, textAlignVertical: 'top' },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: AppColors.mint, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
