type ServerEnvironment = Record<string, unknown>;

declare global {
  // The hosted Worker sets this binding for each request. Expo's local server
  // continues to use process.env through the fallback below.
  var __CYBERPATH_SERVER_ENV__: ServerEnvironment | undefined;
}

export function readServerEnv(name: string): string | undefined {
  const workerValue = globalThis.__CYBERPATH_SERVER_ENV__?.[name];
  if (typeof workerValue === 'string') return workerValue;

  const processLike = (globalThis as typeof globalThis & {
    process?: { env?: ServerEnvironment };
  }).process;
  const processValue = processLike?.env?.[name];

  return typeof processValue === 'string' ? processValue : undefined;
}
