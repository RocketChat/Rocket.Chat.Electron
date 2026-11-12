// Usage, from anywhere in the repository: yarn .:lint:docs
// Checks the relative links of every tracked markdown file, and the repository
// paths that agent instructions name in code spans. Exits 1 on any finding.
import { execFileSync } from 'node:child_process';

import {
  checkCodePaths,
  checkLinks,
  isAgentInstructionFile,
} from './docsLinks.lib';

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8' });

const repoRoot = git('rev-parse', '--show-toplevel').trim();
const tracked = git('-C', repoRoot, 'ls-files', '-z')
  .split('\0')
  .filter(Boolean);

// The changelog quotes old release notes, links included, and is not edited.
const markdown = tracked.filter(
  (file) => file.endsWith('.md') && file !== 'CHANGELOG.md'
);
const topDirs = new Set(
  tracked.filter((file) => file.includes('/')).map((file) => file.split('/')[0])
);

const isIgnored = (path: string): boolean => {
  try {
    execFileSync('git', ['-C', repoRoot, 'check-ignore', '-q', path]);
    return true;
  } catch {
    return false;
  }
};

const links = checkLinks(markdown, repoRoot);
const paths = checkCodePaths(
  markdown.filter(isAgentInstructionFile),
  repoRoot,
  {
    topDirs,
    isIgnored,
  }
);

const errors = [...links.errors, ...paths.errors];
if (errors.length) {
  console.error(`✗ ${errors.length} broken doc reference(s):\n`);
  for (const error of errors) console.error(`  ${error}`);
  console.error(
    '\nFix each link or path. To name a file that no longer exists, write its name without a link or code span.'
  );
  process.exit(1);
}
console.log(
  `✓ doc links OK (${links.files} files), agent paths OK (${paths.files} files)`
);
