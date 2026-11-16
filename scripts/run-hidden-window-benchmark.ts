import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const argument = (name: string, fallback: string): string => {
    const index = args.indexOf(name);
    if (index < 0) return fallback;
    const value = args[index + 1];
    assert(value && !value.startsWith('--'), `Missing value for ${name}`);
    return value;
  };
  const output = path.resolve(
    argument('--output', path.join(os.tmpdir(), 'hidden-window.json'))
  );
  const sampleCount = Number(argument('--samples', '60'));
  assert(
    Number.isInteger(sampleCount) && sampleCount >= 10 && sampleCount <= 600,
    '--samples must be an integer between 10 and 600'
  );
  assert(args.includes('--start-hidden'), 'Pass --start-hidden');
  assert(
    ['before', 'after'].includes(argument('--expect', 'after')),
    '--expect must be before or after'
  );
  const buildRoot = path.resolve(argument('--app', '.'));
  assert(
    fs.existsSync(path.join(buildRoot, 'package.json')) &&
      fs.existsSync(path.join(buildRoot, 'app/main.js')),
    'Build the selected checkout with yarn build first'
  );
  const phaseCount = args.includes('--initial-only') ? 1 : 5;
  const energy = args.includes('--energy');
  assert(!energy || sampleCount === 60, '--energy requires 60 samples');
  const timeoutMs =
    60_000 +
    phaseCount *
      ((energy ? 45_000 : 3000) + sampleCount * (energy ? 1000 : 250) + 5000);
  fs.rmSync(output, { force: true });
  // A separate Node process owns cleanup: the product's shutdown listeners and
  // development watchers must not keep a completed measurement running.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electronPath = require('electron') as string;
  const child = spawn(
    electronPath,
    [path.resolve('scripts/benchmark-hidden-window.ts'), ...args],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  await new Promise<void>((resolve, reject) => {
    let reportComplete = false;
    let failure: Error | undefined;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = (): void => {
      if (!child.killed) child.kill('SIGKILL');
    };
    const readReport = (): void => {
      if (reportComplete || !fs.existsSync(output)) return;
      let report: { phases?: { samples?: unknown[] }[] };
      try {
        report = JSON.parse(fs.readFileSync(output, 'utf8')) as typeof report;
      } catch {
        return;
      }
      if (
        report.phases?.length !== phaseCount ||
        !report.phases.every((p) => p.samples?.length === sampleCount)
      ) {
        failure = new Error('Incomplete benchmark report');
        stop();
        return;
      }
      reportComplete = true;
      stopTimer = setTimeout(stop, 1000);
    };
    const forward =
      (stream: NodeJS.WriteStream) =>
      (chunk: Buffer): void => {
        stream.write(chunk);
        if (chunk.toString().includes('Benchmark failed:')) {
          failure = new Error('Benchmark assertions failed');
          stop();
        }
      };
    child.stdout.on('data', forward(process.stdout));
    child.stderr.on('data', forward(process.stderr));
    const poll = setInterval(readReport, 250);
    const deadline = setTimeout(() => {
      failure = new Error('Benchmark timed out');
      stop();
    }, timeoutMs);
    const cleanup = (): void => {
      clearInterval(poll);
      clearTimeout(deadline);
      clearTimeout(stopTimer);
    };
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (code, signal) => {
      readReport();
      cleanup();
      if (failure) reject(failure);
      else if (reportComplete) resolve();
      else
        reject(
          new Error(
            `Benchmark exited without a complete report (${code ?? signal})`
          )
        );
    });
  });
};
main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
});
