import { spawn } from 'node:child_process';

const nodeOptions = [process.env.NODE_OPTIONS, '--disable-warning=ExperimentalWarning']
  .filter(Boolean)
  .join(' ');
const appCommand =
  process.env.SG_WEATHER_OPS_DEV_WATCH === '0'
    ? ['tsx', 'backend/src/server.ts']
    : ['tsx', 'watch', 'backend/src/server.ts'];
const usePortless = process.env.SG_WEATHER_OPS_DEV_PROXY !== '0';
const command = usePortless ? 'portless' : appCommand[0];
const args = usePortless
  ? ['run', '--name', 'sg-weather-ops-dashboard', ...appCommand]
  : appCommand.slice(1);

const child = spawn(command, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
    PORTLESS_HTTPS: process.env.PORTLESS_HTTPS ?? '0',
    PORTLESS_PORT: process.env.PORTLESS_PORT ?? '1355',
  },
});

let forwardingSignal = false;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    forwardingSignal = true;
    child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal && !forwardingSignal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
