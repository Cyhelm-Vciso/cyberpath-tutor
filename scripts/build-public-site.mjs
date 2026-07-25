import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : 'npm';
const args = npmCli
  ? [npmCli, 'run', 'build:site']
  : ['run', 'build:site'];
const environment = {
  ...process.env,
  CYBERPATH_PUBLIC_DEMO: 'true',
  EXPO_NO_DOTENV: '1',
  EXPO_PUBLIC_PUBLIC_DEMO: 'true',
};

// A public artifact must never inherit a server credential from the shell.
delete environment.OPENAI_API_KEY;

const result = spawnSync(command, args, {
  env: environment,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
