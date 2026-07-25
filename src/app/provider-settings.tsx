import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppScreen, Card, Chip, CircleIcon, IconButton, Pill, PrimaryButton, SectionHeader, Type } from '@/components/cyber/ui';
import { AppColors, Radius, Spacing } from '@/constants/theme';
import {
  ApiStyle,
  DEFAULT_PROVIDER_SETTINGS,
  getProviderPreset,
  getProviderSettings,
  IS_PUBLIC_DEMO,
  LOCAL_PROVIDER_PRESETS,
  Provider,
  ProviderPresetId,
  ProviderSettings,
  PUBLIC_DEMO_OPENAI_UNAVAILABLE_MESSAGE,
  REMOTE_PROVIDER_PRESETS,
  resetProviderSettings,
  saveProviderSettings,
  validateCustomProviderSettings,
} from '@/services/provider-settings';
import { sendTutorMessage } from '@/services/tutor';

const PRESET_ICONS: Record<ProviderPresetId, keyof typeof Ionicons.glyphMap> = {
  'ollama-local': 'infinite',
  'lm-studio-local': 'desktop',
  'localai-local': 'cube',
  'llama-cpp-local': 'terminal',
  'vllm-local': 'speedometer',
  'jan-local': 'layers',
  'custom-local': 'git-network',
  'openai-compatible': 'code-slash',
  'azure-openai-gateway': 'cloud',
  'anthropic-gateway': 'chatbubbles',
  'gemini-vertex-gateway': 'diamond',
  'bedrock-gateway': 'server',
  'private-self-hosted': 'lock-closed',
};

type ProviderFamily = 'openai' | 'local' | 'remote';

export default function ProviderSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<ProviderSettings>(DEFAULT_PROVIDER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string }>();
  const [showKey, setShowKey] = useState(false);
  const [showAdvancedCredentials, setShowAdvancedCredentials] = useState(false);
  const presetDrafts = useRef<
    Partial<Record<ProviderPresetId, ProviderSettings['custom']>>
  >({});

  const selectedPreset = getProviderPreset(settings.custom.preset);
  const selectedFamily: ProviderFamily =
    settings.provider === 'openai'
      ? 'openai'
      : selectedPreset.category === 'local'
        ? 'local'
        : 'remote';
  const visiblePresets =
    selectedPreset.category === 'local'
      ? LOCAL_PROVIDER_PRESETS
      : REMOTE_PROVIDER_PRESETS;
  const isLocalProvider = selectedPreset.category === 'local';
  const isGateway = selectedPreset.credentialPolicy === 'server-gateway';
  const hasHttpUrl = settings.custom.baseUrl.trim().toLowerCase().startsWith('http://');
  const showLocalHttpControl = isLocalProvider || hasHttpUrl;
  const localHttpConsentNeeded =
    settings.provider === 'custom' &&
    hasHttpUrl &&
    !settings.custom.allowLocalHttp;
  const usesUnencryptedHttp =
    settings.provider === 'custom' &&
    hasHttpUrl &&
    settings.custom.allowLocalHttp;

  useEffect(() => {
    getProviderSettings()
      .then((storedSettings) => {
        setSettings(storedSettings);
        presetDrafts.current[storedSettings.custom.preset] = {
          ...storedSettings.custom,
        };
        setShowAdvancedCredentials(
          Boolean(storedSettings.custom.apiKey || storedSettings.custom.headersJson),
        );
      })
      .catch(() => setStatus({ tone: 'error', text: 'Provider settings could not be loaded on this device.' }))
      .finally(() => setLoading(false));
  }, []);

  function applyPreset(current: ProviderSettings, presetId: ProviderPresetId): ProviderSettings {
    if (current.custom.preset === presetId) {
      return { ...current, provider: 'custom' };
    }

    presetDrafts.current[current.custom.preset] = { ...current.custom };
    const savedDraft = presetDrafts.current[presetId];
    if (savedDraft) {
      return { provider: 'custom', custom: { ...savedDraft } };
    }

    const preset = getProviderPreset(presetId);
    const next: ProviderSettings = {
      provider: 'custom',
      custom: {
        ...current.custom,
        preset: presetId,
        baseUrl: preset.defaultBaseUrl,
        allowLocalHttp: false,
        model: preset.defaultModel,
        apiStyle: preset.defaultApiStyle,
        apiKey: '',
        headersJson: '',
      },
    };
    presetDrafts.current[presetId] = { ...next.custom };
    return next;
  }

  function setProviderFamily(family: ProviderFamily) {
    if (IS_PUBLIC_DEMO && family === 'openai') {
      setStatus({
        tone: 'error',
        text: PUBLIC_DEMO_OPENAI_UNAVAILABLE_MESSAGE,
      });
      return;
    }

    setSettings((current) => {
      if (family === 'openai') return { ...current, provider: 'openai' as Provider };

      const currentPreset = getProviderPreset(current.custom.preset);
      if (family === 'local') {
        return currentPreset.category === 'local'
          ? { ...current, provider: 'custom' }
          : applyPreset(current, 'ollama-local');
      }

      return currentPreset.category !== 'local'
        ? { ...current, provider: 'custom' }
        : applyPreset(current, 'openai-compatible');
    });
    setStatus(undefined);
  }

  function updateCustom<K extends keyof ProviderSettings['custom']>(key: K, value: ProviderSettings['custom'][K]) {
    setSettings((current) => ({ ...current, custom: { ...current.custom, [key]: value } }));
    setStatus(undefined);
  }

  function selectPreset(preset: ProviderPresetId) {
    setSettings((current) => applyPreset(current, preset));
    setStatus(undefined);
  }

  async function save() {
    setSaving(true);
    setStatus(undefined);
    try {
      const saved = await saveProviderSettings(settings);
      setSettings(saved);
      presetDrafts.current[saved.custom.preset] = { ...saved.custom };
      setStatus({
        tone: 'success',
        text:
          saved.provider === 'openai'
            ? 'Built-in OpenAI is now selected.'
            : `${getProviderPreset(saved.custom.preset).label} settings were saved.`,
      });
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error ? error.message : 'Provider settings could not be saved.' });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setStatus(undefined);
    try {
      if (IS_PUBLIC_DEMO && settings.provider === 'openai') {
        throw new Error(PUBLIC_DEMO_OPENAI_UNAVAILABLE_MESSAGE);
      }

      const candidate: ProviderSettings = settings.provider === 'custom'
        ? { ...settings, custom: validateCustomProviderSettings(settings.custom) }
        : settings;
      const result = await sendTutorMessage(
        [{ role: 'user', content: 'Reply with exactly: Tutor connection ready.' }],
        { mode: 'explain', topic: 'provider connection test' },
        { settings: candidate },
      );
      setStatus({
        tone: 'success',
        text: `Connected to ${
          result.provider === 'openai'
            ? 'OpenAI'
            : getProviderPreset(candidate.custom.preset).label
        } using ${result.model}.`,
      });
    } catch (error) {
      setStatus({ tone: 'error', text: error instanceof Error ? error.message : 'The connection test failed.' });
    } finally {
      setTesting(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      const defaults = await resetProviderSettings();
      setSettings(defaults);
      presetDrafts.current = {
        [defaults.custom.preset]: { ...defaults.custom },
      };
      setStatus({
        tone: 'success',
        text: IS_PUBLIC_DEMO
          ? 'Provider settings were reset to Local AI with the Ollama default.'
          : 'Provider settings were reset to built-in OpenAI.',
      });
    } catch {
      setStatus({ tone: 'error', text: 'Provider settings could not be reset.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Go back" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <Text style={styles.headerLabel}>TUTOR CONFIGURATION</Text>
          <Text style={styles.headerTitle}>AI provider</Text>
        </View>
        <Pill
          label={usesUnencryptedHttp ? 'Local HTTP enabled' : 'Stored securely'}
          tone={usesUnencryptedHttp ? 'amber' : 'mint'}
          icon={usesUnencryptedHttp ? 'warning' : 'lock-closed'}
        />
      </View>

      <Card style={styles.intro}>
        <CircleIcon name="hardware-chip" color={AppColors.mint} size={54} />
        <View style={styles.flex}>
          <Text style={styles.introTitle}>Choose who powers your tutor.</Text>
          <Text style={Type.bodyMuted}>
            {IS_PUBLIC_DEMO
              ? 'Use a local model running on your computer or your organization’s compatible cloud LLM gateway.'
              : 'Use managed OpenAI, a local model running on your computer, or your organization’s compatible cloud LLM gateway.'}
          </Text>
        </View>
      </Card>

      {IS_PUBLIC_DEMO ? (
        <Card style={styles.demoNotice}>
          <Ionicons name="shield-checkmark" size={21} color={AppColors.amber} />
          <View style={styles.flex}>
            <Text style={styles.demoNoticeTitle}>Public demo mode</Text>
            <Text style={Type.caption}>
              Built-in OpenAI is unavailable in this public demo. Local AI and custom or cloud providers remain available.
            </Text>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Provider" />
      <View style={styles.providerGrid}>
        <ProviderOption
          title="Built-in OpenAI"
          detail={IS_PUBLIC_DEMO ? 'Unavailable in public demo' : 'Key stays on the tutor server'}
          icon="sparkles"
          selected={selectedFamily === 'openai'}
          recommended={!IS_PUBLIC_DEMO}
          disabled={IS_PUBLIC_DEMO}
          onPress={() => setProviderFamily('openai')}
        />
        <ProviderOption
          title="Local AI"
          detail="Ollama, LM Studio & more"
          icon="desktop"
          selected={selectedFamily === 'local'}
          onPress={() => setProviderFamily('local')}
        />
        <ProviderOption
          title="Custom / cloud"
          detail="HTTPS API or secure gateway"
          icon="options"
          selected={selectedFamily === 'remote'}
          onPress={() => setProviderFamily('remote')}
        />
      </View>

      {settings.provider === 'openai' ? (
        <Card style={styles.builtInCard}>
          <View style={styles.secureRow}>
            <View style={styles.lockIcon}><Ionicons name="lock-closed" size={20} color={AppColors.mint} /></View>
            <View style={styles.flex}>
              <Text style={styles.fieldTitle}>Server-managed credential</Text>
              <Text style={Type.caption}>The OpenAI key is never bundled into this app or shown on the device.</Text>
            </View>
            <Pill label="Recommended" tone="mint" />
          </View>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>Default model</Text><Text style={styles.readOnlyValue}>gpt-5.6-luna</Text></View>
          <View style={styles.readOnlyRow}><Text style={styles.readOnlyLabel}>API style</Text><Text style={styles.readOnlyValue}>Responses API</Text></View>
        </Card>
      ) : (
        <>
          <SectionHeader title={isLocalProvider ? 'Local AI software' : 'Connection preset'} />
          <View style={styles.presetGrid}>
            {visiblePresets.map((preset) => (
              <PresetOption
                key={preset.id}
                title={preset.shortLabel}
                detail={preset.description}
                icon={PRESET_ICONS[preset.id]}
                selected={settings.custom.preset === preset.id}
                gateway={preset.credentialPolicy === 'server-gateway'}
                local={preset.category === 'local'}
                onPress={() => selectPreset(preset.id)}
              />
            ))}
          </View>

          <Card style={isGateway || isLocalProvider ? styles.gatewayCard : styles.directCard}>
            <Ionicons
              name={isLocalProvider ? 'desktop' : isGateway ? 'shield-checkmark' : 'warning'}
              size={22}
              color={isGateway || isLocalProvider ? AppColors.mint : AppColors.amber}
            />
            <View style={styles.flex}>
              <View style={styles.policyTitleRow}>
                <Text style={styles.policyTitle}>
                  {isLocalProvider
                    ? 'Direct local connection'
                    : isGateway
                    ? 'Cloud credentials stay at your gateway'
                    : 'Advanced direct connection'}
                </Text>
                <Pill
                  label={isLocalProvider ? 'Local' : isGateway ? 'Gateway' : 'Advanced'}
                  tone={isGateway || isLocalProvider ? 'mint' : 'amber'}
                />
              </View>
              <Text style={Type.caption}>
                {isLocalProvider
                  ? 'Text tutoring and live voice answers go directly to your local model server. Local live conversation uses on-device transcription and a device-local speaking voice; OpenAI is not used.'
                  : isGateway
                  ? 'Enter an OpenAI-compatible gateway URL. Keep Azure, Anthropic, Google, or AWS credentials on that server; this app sends normalized Responses or Chat Completions requests.'
                  : 'Requests go directly from this device to the URL below. Use only a trusted endpoint. For production cloud LLMs, use a server gateway instead.'}
              </Text>
            </View>
          </Card>

          {showLocalHttpControl ? (
            <Card style={styles.localAccessCard}>
              <View style={styles.localAccessRow}>
                <View style={styles.localAccessCopy}>
                  <Text style={styles.fieldTitle}>Allow local HTTP</Text>
                  <Text style={Type.caption}>
                    Required for an http:// localhost or private-network URL. HTTPS URLs work without this switch.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Allow local HTTP"
                  value={settings.custom.allowLocalHttp}
                  onValueChange={(value) => updateCustom('allowLocalHttp', value)}
                  trackColor={{ false: AppColors.borderBright, true: AppColors.mintDark }}
                  thumbColor={settings.custom.allowLocalHttp ? AppColors.mint : AppColors.textMuted}
                />
              </View>
              {localHttpConsentNeeded ? (
                <View style={styles.consentNeededRow}>
                  <Ionicons name="information-circle" size={17} color={AppColors.amber} />
                  <Text style={styles.localHint}>Enable this switch before testing or saving the HTTP connection.</Text>
                </View>
              ) : null}
              <View style={styles.localHintRow}>
                <Ionicons name="phone-portrait-outline" size={17} color={AppColors.amber} />
                <Text style={styles.localHint}>
                  {Platform.OS === 'web'
                    ? 'On a phone, localhost means the phone. Use the computer’s private LAN IP, such as 192.168.1.20, enable CORS on the model server, and grant browser local-network access.'
                    : 'On a phone, localhost means this phone. Use the computer’s private LAN IP, such as 192.168.1.20; the device may request local-network access.'}
                </Text>
              </View>
            </Card>
          ) : null}

          <Card style={styles.formCard}>
            <Field
              label="API Base URL"
              hint={
                isLocalProvider
                  ? 'The preset fills the usual local URL. Change the host or port if your server uses another address.'
                  : 'Use the gateway or compatible API root. Include /v1 when your provider requires it.'
              }>
              <TextInput
                accessibilityLabel="API Base URL"
                value={settings.custom.baseUrl}
                onChangeText={(value) => updateCustom('baseUrl', value)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={selectedPreset.baseUrlPlaceholder}
                placeholderTextColor={AppColors.textDim}
                style={styles.input}
              />
            </Field>
            <Field label="Model name" hint="Use the exact model ID exposed by your provider.">
              <TextInput
                accessibilityLabel="Model name"
                value={settings.custom.model}
                onChangeText={(value) => updateCustom('model', value)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={selectedPreset.modelPlaceholder}
                placeholderTextColor={AppColors.textDim}
                style={styles.input}
              />
            </Field>
            <Field label="API protocol" hint="Most local and third-party servers support Chat Completions; newer ones may support Responses.">
              <View style={styles.protocols}>
                {(['responses', 'chat-completions'] as ApiStyle[]).map((style) => (
                  <Chip key={style} label={style === 'responses' ? 'Responses' : 'Chat Completions'} selected={settings.custom.apiStyle === style} onPress={() => updateCustom('apiStyle', style)} />
                ))}
              </View>
            </Field>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showAdvancedCredentials ? 'Hide advanced credentials' : 'Show advanced credentials'}
              accessibilityState={{ expanded: showAdvancedCredentials }}
              onPress={() => setShowAdvancedCredentials((current) => !current)}
              style={({ pressed }) => [styles.advancedToggle, pressed && styles.pressed]}>
              <View style={styles.advancedToggleCopy}>
                <Ionicons name="key" size={18} color={AppColors.amber} />
                <View style={styles.flex}>
                  <Text style={styles.advancedTitle}>Advanced credentials</Text>
                  <Text style={styles.advancedDetail}>
                    {settings.custom.apiKey || settings.custom.headersJson
                      ? 'A token or custom header is configured'
                      : 'Optional token and custom headers'}
                  </Text>
                </View>
              </View>
              <Ionicons name={showAdvancedCredentials ? 'chevron-up' : 'chevron-down'} size={20} color={AppColors.textMuted} />
            </Pressable>

            {showAdvancedCredentials ? (
              <View style={styles.advancedFields}>
                {usesUnencryptedHttp ? (
                  <View style={styles.cleartextCredentialWarning}>
                    <Ionicons name="warning" size={18} color={AppColors.amber} />
                    <Text style={styles.cleartextCredentialText}>
                      HTTP does not encrypt API keys or custom headers in transit. Use credentials only on a private network you trust, or switch this endpoint to HTTPS.
                    </Text>
                  </View>
                ) : null}
                <Field
                  label={selectedPreset.credentialPolicy === 'server-gateway' ? 'Gateway access token (optional)' : 'API key or token (optional)'}
                  hint={
                    selectedPreset.credentialPolicy === 'server-gateway'
                      ? 'Use only a gateway-issued app token here, never the underlying cloud provider credential.'
                      : Platform.OS === 'web'
                        ? 'Web preview: kept in memory only and cleared on refresh.'
                        : 'Encrypted with the device keychain/keystore.'
                  }>
                  <View style={styles.secretInputRow}>
                    <TextInput
                      accessibilityLabel="API key or token"
                      value={settings.custom.apiKey}
                      onChangeText={(value) => updateCustom('apiKey', value)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!showKey}
                      placeholder="Optional if headers provide authorization"
                      placeholderTextColor={AppColors.textDim}
                      style={[styles.input, styles.secretInput]}
                    />
                    <Pressable accessibilityRole="button" onPress={() => setShowKey((current) => !current)} accessibilityLabel={showKey ? 'Hide API key' : 'Show API key'} style={styles.eyeButton}>
                      <Ionicons name={showKey ? 'eye-off' : 'eye'} size={19} color={AppColors.textMuted} />
                    </Pressable>
                  </View>
                </Field>
                <Field label="Additional headers (optional)" hint="JSON string values only. Header values are treated as secrets.">
                  <TextInput
                    accessibilityLabel="Additional headers"
                    value={settings.custom.headersJson}
                    onChangeText={(value) => updateCustom('headersJson', value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    numberOfLines={4}
                    placeholder={'{"X-Gateway-Token":"token"}'}
                    placeholderTextColor={AppColors.textDim}
                    style={[styles.input, styles.headersInput]}
                  />
                </Field>
              </View>
            ) : null}
          </Card>

          <Card style={styles.warningCard}>
            <Ionicons name="warning" size={21} color={AppColors.amber} />
            <View style={styles.flex}>
              <Text style={styles.warningTitle}>Know where your learning data goes</Text>
              <Text style={Type.caption}>
                {isLocalProvider
                  ? Platform.OS === 'web'
                    ? 'Prompts and scenario context are sent directly to your local URL. The browser may ask for local-network permission. HTTP traffic is not encrypted, so use it only on a network you trust.'
                    : 'Prompts and scenario context are sent directly to your local URL. The device may ask for local-network permission. HTTP traffic is not encrypted, so use it only on a network you trust.'
                  : 'Prompts and scenario context are sent from this device to the API Base URL. Only use a URL you trust. Web endpoints must also allow browser CORS requests.'}
              </Text>
            </View>
          </Card>
        </>
      )}

      {status ? (
        <Card style={status.tone === 'success' ? styles.successStatus : styles.errorStatus}>
          <Ionicons name={status.tone === 'success' ? 'checkmark-circle' : 'alert-circle'} size={21} color={status.tone === 'success' ? AppColors.mint : AppColors.amber} />
          <Text style={styles.statusText}>{status.text}</Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label="Test connection" icon="pulse" secondary onPress={testConnection} loading={testing} disabled={localHttpConsentNeeded} style={styles.flex} />
        <PrimaryButton label="Save provider" icon="checkmark" onPress={save} loading={saving || loading} disabled={localHttpConsentNeeded} style={styles.flex} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={IS_PUBLIC_DEMO ? 'Reset to Local AI' : 'Reset to built-in OpenAI'}
        onPress={reset}
        style={styles.reset}>
        <Text style={styles.resetText}>
          {IS_PUBLIC_DEMO ? 'Reset to Local AI' : 'Reset to built-in OpenAI'}
        </Text>
      </Pressable>
    </AppScreen>
  );
}

function ProviderOption({
  title,
  detail,
  icon,
  selected,
  recommended,
  disabled = false,
  onPress,
}: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  recommended?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerOption,
        selected && styles.providerSelected,
        disabled && styles.providerDisabled,
        pressed && styles.pressed,
      ]}>
      <CircleIcon
        name={icon}
        color={disabled ? AppColors.textDim : selected ? AppColors.mint : AppColors.textMuted}
      />
      {disabled ? (
        <Pill label="Unavailable" tone="amber" />
      ) : recommended ? (
        <Pill label="Recommended" tone="mint" />
      ) : (
        <View style={styles.pillSpacer} />
      )}
      <Text style={[styles.providerTitle, disabled && styles.providerTitleDisabled]}>{title}</Text>
      <Text style={Type.caption}>{detail}</Text>
      <Ionicons
        name={disabled ? 'lock-closed' : selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={23}
        color={disabled ? AppColors.textDim : selected ? AppColors.mint : AppColors.textDim}
        style={styles.providerCheck}
      />
    </Pressable>
  );
}

function PresetOption({ title, detail, icon, selected, gateway, local, onPress }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; gateway: boolean; local: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${local ? ', local AI' : gateway ? ', server gateway' : ', advanced direct connection'}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.presetOption,
        selected && styles.presetSelected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.presetTopRow}>
        <CircleIcon name={icon} color={selected ? AppColors.mint : AppColors.textMuted} size={38} />
        <Pill label={local ? 'Local' : gateway ? 'Gateway' : 'Direct'} tone={local || gateway ? 'mint' : 'amber'} />
      </View>
      <Text style={styles.presetTitle}>{title}</Text>
      <Text style={styles.presetDetail} numberOfLines={3}>{detail}</Text>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={21}
        color={selected ? AppColors.mint : AppColors.textDim}
        style={styles.presetCheck}
      />
    </Pressable>
  );
}

function Field({ label, hint, children }: React.PropsWithChildren<{ label: string; hint: string }>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldTitle}>{label}</Text>
      {children}
      <Text style={styles.fieldHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerCopy: { flex: 1 },
  headerLabel: { color: AppColors.mint, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { color: AppColors.text, fontSize: 22, fontWeight: '900', marginTop: 2 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.xl, backgroundColor: '#0D2928' },
  introTitle: { color: AppColors.text, fontSize: 18, fontWeight: '900', marginBottom: 5 },
  demoNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#2D281B', borderColor: '#5C4A2B' },
  demoNoticeTitle: { color: AppColors.text, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  providerOption: { minHeight: 178, flexGrow: 1, flexBasis: '29%', minWidth: 145, borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated, padding: Spacing.lg, gap: 8 },
  providerSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  providerDisabled: { borderColor: '#5C4A2B', backgroundColor: '#171D20', opacity: 0.72 },
  providerTitle: { color: AppColors.text, fontSize: 15, fontWeight: '900' },
  providerTitleDisabled: { color: AppColors.textMuted },
  providerCheck: { position: 'absolute', right: 13, top: 13 },
  pillSpacer: { height: 25 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetOption: { minHeight: 158, flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderColor: AppColors.border, borderRadius: Radius.lg, backgroundColor: AppColors.inkElevated, padding: Spacing.md, gap: 7 },
  presetSelected: { borderColor: AppColors.mint, backgroundColor: '#0D2928' },
  presetTopRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 22 },
  presetTitle: { color: AppColors.text, fontSize: 13, fontWeight: '900', paddingRight: 20 },
  presetDetail: { color: AppColors.textDim, fontSize: 10, lineHeight: 14 },
  presetCheck: { position: 'absolute', right: 10, bottom: 10 },
  gatewayCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#0D2928', borderColor: AppColors.borderBright },
  directCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#2D281B', borderColor: '#5C4A2B' },
  localAccessCard: { gap: Spacing.md, backgroundColor: '#102B2A', borderColor: AppColors.borderBright },
  localAccessRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  localAccessCopy: { flex: 1 },
  consentNeededRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderTopWidth: 1, borderTopColor: AppColors.border, paddingTop: Spacing.md },
  localHintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderTopWidth: 1, borderTopColor: AppColors.border, paddingTop: Spacing.md },
  localHint: { flex: 1, color: AppColors.textDim, fontSize: 10, lineHeight: 15 },
  policyTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: 5 },
  policyTitle: { color: AppColors.text, fontSize: 13, fontWeight: '900', flexShrink: 1 },
  builtInCard: { gap: Spacing.lg },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  lockIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: AppColors.mintDark, alignItems: 'center', justifyContent: 'center' },
  fieldTitle: { color: AppColors.text, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  readOnlyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: AppColors.border, paddingTop: Spacing.md },
  readOnlyLabel: { color: AppColors.textDim, fontSize: 11, fontWeight: '700' },
  readOnlyValue: { color: AppColors.text, fontSize: 12, fontWeight: '800' },
  formCard: { gap: Spacing.xl },
  field: { gap: 1 },
  input: { minHeight: 50, borderWidth: 1, borderColor: AppColors.borderBright, borderRadius: Radius.md, backgroundColor: AppColors.panel, color: AppColors.text, fontSize: 13, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  fieldHint: { color: AppColors.textDim, fontSize: 10, lineHeight: 15, marginTop: 6 },
  protocols: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  advancedToggle: { minHeight: 58, borderWidth: 1, borderColor: '#5C4A2B', borderRadius: Radius.md, backgroundColor: '#2D281B', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  advancedToggleCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  advancedTitle: { color: AppColors.text, fontSize: 12, fontWeight: '800' },
  advancedDetail: { color: AppColors.textDim, fontSize: 10, lineHeight: 14, marginTop: 2 },
  advancedFields: { gap: Spacing.xl },
  cleartextCredentialWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderWidth: 1, borderColor: '#5C4A2B', borderRadius: Radius.md, backgroundColor: '#2D281B', padding: Spacing.md },
  cleartextCredentialText: { flex: 1, color: AppColors.textMuted, fontSize: 10, lineHeight: 15 },
  secretInputRow: { flexDirection: 'row', alignItems: 'center' },
  secretInput: { flex: 1, paddingRight: 48 },
  eyeButton: { position: 'absolute', right: 4, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headersInput: { minHeight: 100, textAlignVertical: 'top', fontFamily: 'monospace' },
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: '#2D281B', borderColor: '#5C4A2B' },
  warningTitle: { color: AppColors.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  successStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#0D2928', borderColor: AppColors.mint },
  errorStatus: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: '#2D281B', borderColor: AppColors.amber },
  statusText: { color: AppColors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  reset: { alignSelf: 'center', padding: Spacing.md },
  resetText: { color: AppColors.textDim, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
