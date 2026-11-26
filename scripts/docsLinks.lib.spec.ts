import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkCodePaths,
  checkLinks,
  isAgentInstructionFile,
  slug,
} from './docsLinks.lib';

const fixture = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'docs-links-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
};

describe('slug', () => {
  it('follows GitHub rules', () => {
    expect(slug('The EE tree (`ee/server/`) and the license boundary')).toBe(
      'the-ee-tree-eeserver-and-the-license-boundary'
    );
    expect(slug('Ação rápida')).toBe('ação-rápida');
    expect(slug('A — B')).toBe('a--b');
  });
});

describe('checkLinks', () => {
  it('accepts valid links in every supported form', () => {
    const root = fixture({
      'Target.md':
        '# Ação rápida\n## Closed ##\nSetext Title\n===\nSub Title\n---\n<a id="custom"></a>\n<a class="x" name="later"></a>\n## Dup\n## Dup\n## [Start](./index.md)\n',
      'my file.md': '# Spaced\n',
      'index.md': [
        '[a](./Target.md#ação-rápida) [b](Target.md#closed) [c](Target.md#custom) [d](Target.md#dup-1)',
        '[e](my%20file.md#spaced) [f](<my file.md>) [g](//example.com) [h](https://x.y) [i](mailto:a@b)',
        '[k](Target.md#later) [l](Target.md#start) <a href="Target.md#custom">m</a> [n](',
        'Target.md#closed)',
        '[ref]: ./Target.md',
        '`[not a link](missing.md)` and ``[nor](missing.md)``',
        '[o](Target.md#setext-title) [p](Target.md#sub-title) `wrapped',
        '[span](missing.md)`',
        '````md',
        '```',
        '[inside fence](missing.md)',
        '```',
        '````',
        '## Local',
        '[j](#local)',
      ].join('\n'),
    });

    expect(
      checkLinks(['Target.md', 'my file.md', 'index.md'], root).errors
    ).toEqual([]);
  });

  it('reports broken files, anchors and case mismatches', () => {
    const root = fixture({
      'Target.md': '# Real\n',
      'index.md':
        '[a](missing.md) [b](Target.md#nope) [c](target.md) [d](#gone)\n[ref]: ./also-missing.md\n<a href="html-missing.md">e</a> [f](\nwrapped-missing.md)\n',
    });

    expect(checkLinks(['index.md'], root).errors).toHaveLength(7);
  });

  it('reports a code span that a blank line ends', () => {
    const root = fixture({
      'index.md': 'A stray ` tick.\n\n[a](missing.md) and a ` tick.\n',
    });

    expect(checkLinks(['index.md'], root).errors).toEqual([
      'index.md: broken link -> missing.md',
    ]);
  });

  it('does not compare the case of the repository root itself', () => {
    // A Windows temp directory such as C:\Users\RUNNER~1 uses a short name that no directory listing contains.
    const root = fixture({
      'Target.md': '# T\n',
      'index.md': '[a](Target.md)\n',
    });
    const renamed = root.toUpperCase();
    if (!existsSync(renamed)) return; // case-sensitive file system

    expect(checkLinks(['index.md'], renamed).errors).toEqual([]);
  });

  it('resolves a leading slash from the repository root', () => {
    const root = fixture({
      'docs/guide.md': '[a](/README.md) [b](/docs/missing.md)\n',
      'README.md': '# Readme\n',
    });

    expect(checkLinks(['docs/guide.md'], root).errors).toEqual([
      'docs/guide.md: broken link -> /docs/missing.md',
    ]);
  });
});

describe('checkCodePaths', () => {
  const options = (ignored: string[] = []) => ({
    topDirs: new Set(['docs', 'src', 'scripts', '.claude']),
    isIgnored: (path: string) => ignored.includes(path),
  });

  it('reports an agent file that names a deleted doc', () => {
    const root = fixture({
      'docs/release-process.md': '# Release Process\n',
      '.claude/agents/release-readiness.md':
        '- `docs/pre-release-process.md` — stable release process.\n- `docs/release-process.md` — release process.\n',
    });

    expect(
      checkCodePaths(['.claude/agents/release-readiness.md'], root, options())
        .errors
    ).toEqual([
      '.claude/agents/release-readiness.md:1: `docs/pre-release-process.md` names a path that does not exist',
    ]);
  });

  it('accepts paths that exist, resolve from the file, or are ignored', () => {
    const root = fixture({
      'src/main.ts': '',
      '.claude/skills/pr-watch/scripts/watch.sh': '',
      '.claude/skills/pr-watch/SKILL.md': [
        'Run `scripts/watch.sh` from this skill.',
        'Edit `src/main.ts:12`, `src/main.ts#L3` and `src/`.',
        'Delete `scripts/msi-test/.known_hosts` first.',
        'Read `scripts/generated.json` and `./src/main.ts`.',
      ].join('\n'),
    });

    expect(
      checkCodePaths(
        ['.claude/skills/pr-watch/SKILL.md'],
        root,
        options([
          'scripts/msi-test/.known_hosts',
          '.claude/skills/pr-watch/scripts/generated.json',
        ])
      ).errors
    ).toEqual([]);
  });

  it('checks a path that starts with ./', () => {
    const root = fixture({ 'AGENTS.md': 'Read `./docs/retired.md`.\n' });

    expect(checkCodePaths(['AGENTS.md'], root, options()).errors).toEqual([
      'AGENTS.md:1: `./docs/retired.md` names a path that does not exist',
    ]);
  });

  it('skips placeholders, globs, fenced blocks and paths outside the repository', () => {
    const root = fixture({
      'AGENTS.md': [
        'Specs live in `src/<module>/main/` and `docs/postmortem-*.md`.',
        'Run `git diff dev...HEAD` and read `app/` or `dist/main.js`.',
        '```sh',
        'cat `docs/missing.md`',
        '```',
      ].join('\n'),
    });

    expect(checkCodePaths(['AGENTS.md'], root, options()).errors).toEqual([]);
  });

  it('compares the case of each path segment', () => {
    const root = fixture({
      'docs/KNOWN_ISSUES.md': '',
      'AGENTS.md': 'Read `docs/known_issues.md`.\n',
    });

    expect(checkCodePaths(['AGENTS.md'], root, options()).errors).toEqual([
      'AGENTS.md:1: `docs/known_issues.md` names a path that does not exist',
    ]);
  });
});

describe('isAgentInstructionFile', () => {
  it.each([
    ['AGENTS.md', true],
    ['qa/AGENTS.md', true],
    ['.claude/agents/release-readiness.md', true],
    ['.claude/skills/ship-release/SKILL.md', true],
    ['skills/dev-app-verify/SKILL.md', true],
    ['docs/release-process.md', false],
    ['.claude/hooks/typecheck.sh', false],
  ])('%s → %s', (file, expected) => {
    expect(isAgentInstructionFile(file)).toBe(expected);
  });
});
