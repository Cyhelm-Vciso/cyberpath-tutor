const MAX_PROVIDER_OUTPUT_LENGTH = 12_000;

export function redactSensitiveValues(
  value: string,
  secrets: readonly string[],
): string {
  let redacted = value;

  for (const secret of secrets) {
    if (secret.length >= 4) {
      redacted = redacted.split(secret).join('[redacted]');
    }
  }

  return redacted
    .replace(/\bBearer\s+[^\s,;]+/giu, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/gu, '[redacted]');
}

export function sanitizeProviderOutput(
  value: string,
  secrets: readonly string[],
): string {
  return redactSensitiveValues(value, secrets)
    .replace(/\r\n?/gu, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, ' ')
    .trim()
    .slice(0, MAX_PROVIDER_OUTPUT_LENGTH);
}
