import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { summarizeError } from '../errorSummary';

// Packaged builds drop `console.*` from the main process, so a lost
// save or a failed delete must go through `loggers.e2eeSearch`. The log must
// not carry an index path (it holds the user id) or raw error text (an fs
// error message holds the path).
const SOURCE_DIR = path.resolve(__dirname, '..');

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => name.endsWith('.ts') && !name.includes('.spec.'))
    .map((name) => path.join(SOURCE_DIR, name));

// The text of each `loggers.e2eeSearch.<level>(...)` call, with nested
// parentheses.
const loggerCalls = (source: string): string[] => {
  const calls: string[] = [];
  const start = /loggers\.e2eeSearch\.(?:debug|info|warn|error)\(/g;
  let match: RegExpExecArray | null;
  while ((match = start.exec(source))) {
    let depth = 1;
    let end = match.index + match[0].length;
    while (depth > 0 && end < source.length) {
      if (source[end] === '(') depth++;
      if (source[end] === ')') depth--;
      end++;
    }
    calls.push(source.slice(match.index, end));
  }
  return calls;
};

describe('E2EE search logging', () => {
  it('has no console call in the main code', () => {
    const offenders = sourceFiles().flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${path.basename(file)}:${i + 1}` }))
        .filter(({ line }) => /\bconsole\.\w+\(/.test(line))
        .map(({ at }) => at)
    );
    expect(offenders).toEqual([]);
  });

  it('logs no index path and no raw error', () => {
    const offenders = sourceFiles().flatMap((file) =>
      loggerCalls(fs.readFileSync(file, 'utf8'))
        .filter((call) => {
          const withoutSummaries = call.replace(
            /summarizeError\(\s*\w+\s*\)/g,
            ''
          );
          return (
            /\bindexId\b|\bindexDir\b|\bserverUrl\b|\bdir\b/.test(call) ||
            /\b(?:error|err|e)\b/.test(
              withoutSummaries.replace(/^loggers\.e2eeSearch\.\w+/, '')
            )
          );
        })
        .map((call) => `${path.basename(file)}: ${call}`)
    );
    expect(offenders).toEqual([]);
  });
});

describe('summarizeError', () => {
  it('keeps the name and code of an fs error, not its path', async () => {
    const missing = path.join(
      os.tmpdir(),
      'e2ee-search-user-42',
      'snapshot.db'
    );
    const error = await fs.promises.readFile(missing).catch((e) => e);
    expect(String(error.message)).toContain('user-42');

    const summary = summarizeError(error);

    expect(summary).toEqual({ name: 'Error', code: 'ENOENT' });
    expect(JSON.stringify(summary)).not.toContain('user-42');
  });

  it('keeps only the type of a value that is not an error', () => {
    expect(summarizeError('/home/alice/secret')).toEqual({ name: 'string' });
  });
});
