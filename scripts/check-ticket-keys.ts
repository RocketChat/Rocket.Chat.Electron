import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

import { findTicketKeys } from './ticketKeys.lib';

// The spec of the checker holds keys on purpose, as test input.
const ALLOWED_FILES = new Set(['scripts/ticketKeys.lib.spec.ts']);

const files = execFileSync(
  'git',
  ['ls-files', '--', 'src', 'scripts', '.github/workflows'],
  { encoding: 'utf8' }
)
  .split('\n')
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  .filter((file) => !ALLOWED_FILES.has(file));

let count = 0;
for (const file of files) {
  for (const { key, line } of findTicketKeys(
    readFileSync(file, 'utf8'),
    file
  )) {
    count++;
    console.error(
      `${file}:${line}: remove the Jira key ${key}. This repository is public and Jira is internal. Say what the code does instead, and put the key in the PR title or the commit subject.`
    );
  }
}

if (count > 0) {
  console.error(`\n${count} Jira key(s) found in comments or strings.`);
  process.exit(1);
}
