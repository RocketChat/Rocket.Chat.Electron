import { spawn } from 'child_process';

import * as core from '@actions/core';

const mergeEnv = (env?: Record<string, string>) => {
  if (!env) {
    return undefined;
  }

  if (process.platform === 'darwin') {
    return {
      ...process.env,
      ...env,
    };
  }

  return env;
};

export const run = (
  command: string,
  env?: Record<string, string>
): Promise<void> =>
  core.group(
    `$ ${command}`,
    () =>
      new Promise<void>((resolve, reject) => {
        const p = spawn(command, {
          env: mergeEnv(env),
          shell: true,
          stdio: 'inherit',
        });

        p.once('exit', (exitCode) => {
          if (exitCode === 0) {
            resolve();
            return;
          }

          reject(new Error(`process failed (exitCode=${exitCode})`));
        });
      })
  );

export const runAndBuffer = (
  command: string,
  env?: Record<string, string>
): Promise<string> =>
  new Promise((resolve, reject) => {
    const p = spawn(command, {
      env: mergeEnv(env),
      shell: true,
    });

    let buffer = Buffer.of();
    p.stdout.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
    });

    p.once('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve(buffer.toString('utf-8'));
        return;
      }

      reject(new Error(`process failed (exitCode=${exitCode})`));
    });
  });

export const runElectronBuilder = (
  args: string,
  env?: Record<string, string>
): Promise<void> =>
  run(`yarn --silent electron-builder --publish never ${args}`, env);
