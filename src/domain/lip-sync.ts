const AUDIO_NOISE_FLOOR = 0.035;
const AUDIO_FULL_OPEN_LEVEL = 0.45;

export function normalizeLipSyncLevel(
  level: number | undefined,
): number | undefined {
  if (level === undefined || !Number.isFinite(level)) return undefined;
  if (level <= AUDIO_NOISE_FLOOR) return 0;

  const normalized =
    (Math.min(1, level) - AUDIO_NOISE_FLOOR) /
    (AUDIO_FULL_OPEN_LEVEL - AUDIO_NOISE_FLOOR);
  return Math.min(1, Math.max(0, normalized)) ** 0.72;
}
