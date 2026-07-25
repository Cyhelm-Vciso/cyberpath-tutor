import type { RealtimeSessionCreateRequest } from 'openai/resources/realtime/realtime';

import { buildTutorInstructions } from './tutor-prompt';

interface RealtimeSessionPolicyOptions {
  model: string;
  transcriptionModel: string;
  voice: string;
  mode: 'tutor' | 'interview';
}

function makeVoiceInstructions(mode: 'tutor' | 'interview'): string {
  const tutorMode = mode === 'interview' ? 'interview' : 'explain';
  return `${buildTutorInstructions({ mode: tutorMode })}

VOICE SESSION RULES
- This is a live spoken tutoring session. Use natural, professional language and keep most turns under 120 words.
- Ask only one clear question at a time, then wait for the learner to answer.
- When the learner interrupts, stop and address the new question directly.
- Never ask the learner to read out passwords, API keys, access tokens, personal data, customer data, or details of a live target.
- If audio is unclear, say what was unclear and ask the learner to repeat it instead of guessing.`;
}

export function buildRealtimeSessionConfig({
  model,
  transcriptionModel,
  voice,
  mode,
}: RealtimeSessionPolicyOptions): RealtimeSessionCreateRequest {
  return {
    type: 'realtime',
    model,
    output_modalities: ['audio'],
    max_output_tokens: 1_200,
    instructions: makeVoiceInstructions(mode),
    audio: {
      input: {
        transcription: { model: transcriptionModel },
        noise_reduction: { type: 'near_field' },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'auto',
          create_response: true,
          interrupt_response: true,
        },
      },
      output: { voice },
    },
  };
}
