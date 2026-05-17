import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd());
const frontendCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const frontendArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm run dev']
  : ['run', 'dev'];

const backend = spawn('python', ['app.py'], {
  cwd: path.join(repoRoot, 'backend'),
  stdio: 'inherit',
});

const frontend = spawn(frontendCommand, frontendArgs, {
  cwd: path.join(repoRoot, 'frontend'),
  stdio: 'inherit',
});

const shutdown = (signal) => {
  for (const child of [backend, frontend]) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

backend.on('exit', (code, signal) => {
  if (signal) {
    shutdown(signal);
    process.exit(0);
  }

  if (code && code !== 0) {
    shutdown('SIGTERM');
    process.exit(code);
  }
});

frontend.on('exit', (code, signal) => {
  if (signal) {
    shutdown(signal);
    process.exit(0);
  }

  if (code && code !== 0) {
    shutdown('SIGTERM');
    process.exit(code);
  }
});