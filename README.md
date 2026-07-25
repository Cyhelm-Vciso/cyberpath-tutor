# CyberPath Tutor

CyberPath Tutor is an Expo mobile and web app for learning cybersecurity careers through structured pathways, short lessons, realistic role-play, simulations, interview practice, and an interactive AI tutor.

## Public site

The public demo is available at [cyberpath-tutor.zikb78.chatgpt.site](https://cyberpath-tutor.zikb78.chatgpt.site/).
The public source repository is [Cyhelm-Vciso/cyberpath-tutor](https://github.com/Cyhelm-Vciso/cyberpath-tutor).

The public deployment intentionally has no shared `OPENAI_API_KEY`. Its client build sets `EXPO_PUBLIC_PUBLIC_DEMO=true`, and its server sets `CYBERPATH_PUBLIC_DEMO=true` as a second safety lock. Built-in OpenAI text tutoring, OpenAI Realtime, and OpenAI-managed recording transcription are disabled there. Before using the tutor, open **Profile -> AI provider** and configure one of these:

- A local OpenAI-compatible model such as Ollama, LM Studio, llama.cpp, LocalAI, vLLM, or Jan.
- A trusted custom OpenAI-compatible API.
- An organization-controlled OpenAI-compatible gateway in front of a cloud model.

The public site does not proxy or store custom provider credentials. In the web build, direct API keys and custom header values remain in memory only and are cleared by a refresh.

## What is included

- 18 careers from junior analyst through senior practitioner, manager, principal architect, incident commander, privacy and risk roles, and CISO.
- Six career families: operations, incident response, engineering, offensive assurance, GRC/privacy/advisory, and leadership.
- A repeatable learning cycle: Brief, Learn, Check, Apply, and Debrief.
- Fictional defensive scenarios with evidence, decisions, consequences, and transparent rubrics.
- Local learner profile, lesson progress, scenario attempts, XP, readiness indicators, and evidence history.
- Text tutor modes for explanation, coaching, role-play, quizzes, scenarios, interview practice, and career planning.
- Live voice tutoring and interview practice with captions, two professional AI tutor personas, and voice-responsive avatar animation.
- Local, custom, and gateway provider presets using OpenAI-compatible Responses or Chat Completions requests.

## Voice modes and data flow

The voice screen offers different modes because local browser speech and managed OpenAI voice have different compatibility and privacy boundaries.

| Mode | Microphone transcription | Tutor answer | Spoken reply | Public site |
| --- | --- | --- | --- | --- |
| **Local Live Conversation** | On-device English speech recognition in a supported desktop Chromium browser | The selected local, custom, or gateway LLM | An installed device/system voice | Available when the browser and selected provider are compatible |
| **Provider Voice Turns** | The recording is uploaded to `/api/voice/transcribe` and transcribed by OpenAI | The selected built-in, local, custom, or gateway LLM | An installed device/system voice | Disabled because the public server has no OpenAI key |
| **OpenAI Realtime** | Managed OpenAI Realtime over WebRTC | OpenAI Realtime | OpenAI Realtime | Disabled because the public server has no OpenAI key |

Local Live Conversation is the fully non-OpenAI voice path when a local or custom provider is selected. It sends the final on-device transcript and tutor history directly to the configured provider URL. The app does not silently fall back to online speech recognition.

Provider Voice Turns are not fully local, even when Ollama or another local LLM writes the answer. Each recorded answer is sent to the app server and then to OpenAI transcription before the resulting text is sent to the selected LLM. Self-hosters must configure `OPENAI_API_KEY` and have transcription API access for this mode.

The app does not intentionally retain raw microphone recordings. Audio sent to OpenAI is still processed under the API account and retention settings of the self-hosted deployment.

Maya requests a female-presenting voice and Daniel requests a male-presenting voice. OpenAI Realtime uses the configured tutor voices. Local and turn-based modes choose from voices installed by the operating system, so the exact voice, gender presentation, quality, and language availability can vary by device.

The included avatar animation is responsive lip movement rather than phoneme-accurate viseme rendering.

### Local Live Conversation requirements

Local Live Conversation requires all of the following:

- A secure web context. The hosted HTTPS site and `http://localhost` are secure contexts; a plain `http://192.168.x.x` web page is not.
- A current desktop Chromium browser that implements strict on-device `SpeechRecognition`, including `processLocally`, `available()`, and `install()`. These APIs remain experimental and are not supported by every Chromium build or operating system.
- Permission to use the microphone and, when applicable, access the local network.
- An English (`en-US`) on-device speech pack. The browser may offer to download it on first use.
- At least one installed English system speaking voice.

If any requirement is unavailable, use text tutoring. Provider Voice Turns are an additional fallback only on a self-hosted deployment with OpenAI transcription configured.

## Run locally

Requirements:

- Node.js 22.13 or newer.
- npm, using the committed `package-lock.json`.
- One of: a modern web browser, Expo Go, an Android emulator, or an iOS simulator.

Install and start the development server:

```bash
npm ci
npm run start
```

Press `w` for the web app, or scan the QR code with Expo Go. In Expo development, native clients automatically target the development server for API routes.

For optional self-hosted OpenAI features, copy the environment template before starting:

```bash
# macOS or Linux
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Leave `OPENAI_API_KEY` blank when using only local or direct custom providers. `.env.local` is ignored by Git.

## Configure a local LLM

Start the model server first, then open **Profile -> AI provider -> Local AI**. Select a preset, confirm the URL and exact installed model ID, select **Chat Completions** unless the server explicitly supports the Responses API, enable **Allow local HTTP** when needed, and run **Test connection**.

Common defaults:

| Provider | OpenAI-compatible base URL | Typical protocol | Notes |
| --- | --- | --- | --- |
| Ollama | `http://127.0.0.1:11434/v1` | Chat Completions | Start Ollama and use a model name shown by `ollama list`, such as `llama3.2`. |
| LM Studio | `http://127.0.0.1:1234/v1` | Chat Completions | Load a model and start LM Studio's local server; use the model identifier shown by the server. |
| llama.cpp | `http://127.0.0.1:8080/v1` | Chat Completions | Start `llama-server` and use the served model alias. |
| Other compatible server | `http://127.0.0.1:<port>/v1` or `https://host.example/v1` | Chat Completions or Responses | The server must implement the selected OpenAI-compatible endpoint. |

Enter the API root ending in `/v1`, not only the host. The app appends `/chat/completions` or `/responses` unless that endpoint is already present.

### Localhost, phones, and private networks

- In a browser running on the same computer as the model, use `127.0.0.1` or `localhost`.
- On a physical phone, `localhost` means the phone itself. Use the model computer's private LAN address, for example `http://192.168.1.20:11434/v1`.
- Configure the model server to listen on a reachable private interface rather than loopback only. Do not enter `0.0.0.0` as the client URL.
- Keep the phone and model computer on the same trusted network and allow the model port through the host firewall.
- Native requests do not use browser CORS, but the server must still be reachable and the device may request local-network permission.

### Browser CORS, local-network access, and mixed content

Direct browser requests are cross-origin. The model server or gateway must answer CORS preflight requests and allow:

- The exact app origin.
- `OPTIONS` and `POST`.
- `Content-Type`, `Authorization`, and any custom headers entered in the app.

Do not use a wildcard origin together with credentialed browser requests. This app sends custom requests with browser credentials omitted, but API keys in authorization headers still require the header to be allowed by CORS.

When an HTTPS site calls an HTTP private address, browser behavior varies:

- Current Chrome can request Local Network Access permission and can exempt private IP literals or `.local` names from mixed-content blocking.
- Denying that permission blocks the request.
- Other browsers or older Chromium versions may still block HTTPS-to-HTTP local requests as mixed content.

For the most reliable setup, run the web app on the same computer at `http://localhost`, expose the model through trusted local HTTPS, or use a native build. Never send an API key or sensitive custom header over unencrypted HTTP unless the network and endpoint are fully trusted.

## Configure a custom or cloud LLM

The Azure/OpenAI, Anthropic, Gemini/Vertex, and AWS Bedrock presets are gateway presets, not direct vendor SDK integrations. Supply an organization-controlled gateway that:

- Accepts OpenAI-compatible `POST /v1/responses` or `POST /v1/chat/completions` requests.
- Translates the request to the selected cloud provider.
- Holds the underlying Azure, Anthropic, Google, or AWS credentials on the server.
- Returns an OpenAI-compatible response.
- Allows the app origin through CORS when called from the web.

Enter only a gateway-issued app token or custom gateway headers in the client. Do not place cloud-provider credentials in the app. Direct custom secrets use iOS Keychain or Android Keystore through Expo SecureStore; the web build keeps them in memory only.

## Optional self-hosted OpenAI features

The source includes server routes for built-in text tutoring, OpenAI Realtime, and one-turn recording transcription. They are disabled unless a server-side `OPENAI_API_KEY` is configured.

For local development, set the key in `.env.local`. For a deployed server, configure it as a secret in the hosting environment; do not upload `.env.local` or expose the key through an `EXPO_PUBLIC_` variable.

Optional model variables and their current allowlist constraints are documented in `.env.example`. OpenAI API access, credits, project limits, and model availability are separate from a ChatGPT subscription.

## Native production builds and API routes

Expo API routes run on a server; they are not embedded in an iOS or Android binary.

- During Expo development, the app automatically uses the Expo development server.
- For a production native build that uses built-in OpenAI or Provider Voice Turns, deploy the web/server output to an HTTPS origin and set `EXPO_PUBLIC_API_URL` to that origin at build time.
- A production native app using only a direct local or custom text provider can operate without the built-in OpenAI routes, but Provider Voice Turns still require the deployed transcription route.

`EXPO_PUBLIC_API_URL` must be an absolute server origin without credentials, a query, or a fragment. Production builds require HTTPS; development builds may use an HTTP private-network origin.

## Build and preview

Create the standard Expo web/server export:

```bash
npm run build
```

Preview a standard Expo export locally:

```bash
npx expo serve
```

The repository's public site uses an additional Worker/Sites wrapper with an `ASSETS` binding:

```bash
npm run build:site
```

The resulting Worker entry is hosting-specific and is not a standalone Node.js server. For a public artifact, use the dedicated build, which disables dotenv loading, removes any inherited `OPENAI_API_KEY`, embeds the public client policy, and enables the server policy:

```bash
npm run build:public
```

## Tests and checks

Run the complete lint, type, unit, build, and hosted-worker suite before opening a pull request:

```bash
npm run check
```

`npm test` runs the focused unit suites, builds the Sites worker, and then tests the hosted routes. Individual `test:*` scripts—including `test:public-demo`, `test:provider`, and the voice suites—remain available for focused development.

## Security and production boundary

The public site intentionally does not contain a shared OpenAI key. If you enable built-in OpenAI on another deployment, add authenticated user sessions, durable per-user and edge rate limits, concurrent-session caps, usage quotas, spend limits, abuse monitoring, and explicit retention policies in front of:

- `/api/tutor`
- `/api/voice/session`
- `/api/voice/transcribe`

Use HTTPS for public or credentialed endpoints. Local HTTP is an explicit development/private-network option and provides no transport encryption. Review the destination shown in provider settings before sending proprietary prompts, scenario context, transcripts, tokens, or headers.

## Safety scope

The tutor teaches authorized, defensive, and career-focused cybersecurity. Scenarios use fictional organizations, synthetic logs, reserved addresses, and explicit rules of engagement. It redirects destructive or unauthorized requests into safe lab exercises and does not provide hiring, certification, legal, or regulatory guarantees.

## License

CyberPath Tutor is available under the MIT License. See [LICENSE](./LICENSE).
