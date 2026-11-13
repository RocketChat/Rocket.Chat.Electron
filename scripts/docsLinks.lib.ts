// Ported from the Rocket.Chat repository (scripts/check-docs-links.mjs), then
// extended with checkCodePaths for the paths that agent instructions name in
// code spans.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, parse, resolve } from 'node:path';

// GitHub's slug: lowercase, drop punctuation (Unicode letters and digits survive), one hyphen per space.
export const slug = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

// Blanks the lines inside fenced code blocks; a fence closes only with the same marker, at least as long.
const stripFences = (content: string): string[] => {
  let fence: string | null = null;
  return content.split('\n').map((line) => {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (m) {
      if (!fence) {
        fence = m[1];
        return '';
      }
      if (m[1][0] === fence[0] && m[1].length >= fence.length && !m[2].trim()) {
        fence = null;
        return '';
      }
    }
    return fence ? '' : line;
  });
};

const stripCodeSpans = (line: string): string =>
  line.replace(/(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, '');

const anchorsOf = (file: string): Set<string> => {
  const anchors = new Set<string>();
  for (const line of stripFences(readFileSync(file, 'utf8'))) {
    for (const m of line.matchAll(
      /<a\s[^>]*?\b(?:id|name)=["']([^"']+)["']/g
    )) {
      anchors.add(m[1]);
    }
    const heading = /^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
    if (!heading) continue;
    const base = slug(heading[1].replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1'));
    let candidate = base;
    for (let n = 1; anchors.has(candidate); n++) candidate = `${base}-${n}`;
    anchors.add(candidate);
  }
  return anchors;
};

// existsSync is case-insensitive on macOS and Windows, so compare every segment against the real directory listing.
export const existsExact = (path: string): boolean => {
  if (!existsSync(path)) return false;
  const { root } = parse(path);
  let current = root;
  for (const segment of path
    .slice(root.length)
    .split(/[\\/]/)
    .filter(Boolean)) {
    if (!readdirSync(current).includes(segment)) return false;
    current = join(current, segment);
  }
  return true;
};

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// Link targets that contain ")", setext headings and indented code blocks are not parsed.
const inlineLinkRe = /\]\(\s*(<[^>]*>|[^)\s]+)/g;
const htmlLinkRe = /<a\s[^>]*?\bhref=["']([^"']+)["']/g;
const referenceLinkRe = /^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/;

export type CheckResult = { files: number; errors: string[] };

// Checks that every relative link in the given markdown files points to a file
// that exists, with the exact case, and that each #anchor matches a heading or
// an <a id> in the target file. External links are skipped. Paths are relative
// to repoRoot.
export const checkLinks = (
  files: readonly string[],
  repoRoot: string
): CheckResult => {
  const anchorCache = new Map<string, Set<string>>();
  const getAnchors = (file: string): Set<string> => {
    let anchors = anchorCache.get(file);
    if (!anchors) {
      anchors = anchorsOf(file);
      anchorCache.set(file, anchors);
    }
    return anchors;
  };

  const errors: string[] = [];
  for (const file of files) {
    const absolute = resolve(repoRoot, file);
    const lines = stripFences(readFileSync(absolute, 'utf8')).map(
      stripCodeSpans
    );
    // Inline and HTML links may break across lines; reference definitions are one per line.
    const text = lines.join('\n');
    const targets = [
      ...[...text.matchAll(inlineLinkRe)].map((m) => m[1]),
      ...[...text.matchAll(htmlLinkRe)].map((m) => m[1]),
      ...lines.flatMap((line) => referenceLinkRe.exec(line)?.slice(1) ?? []),
    ];

    for (let target of targets) {
      if (target.startsWith('<')) target = target.slice(1, -1);
      if (
        !target ||
        target.startsWith('//') ||
        /^[a-z][a-z0-9+.-]*:/i.test(target)
      ) {
        continue;
      }

      const hashIndex = target.indexOf('#');
      const path = decode(
        hashIndex === -1 ? target : target.slice(0, hashIndex)
      );
      const anchor =
        hashIndex === -1 ? '' : decode(target.slice(hashIndex + 1));

      if (!path) {
        if (anchor && !getAnchors(absolute).has(anchor)) {
          errors.push(`${file}: missing anchor #${anchor} (same file)`);
        }
        continue;
      }

      const resolved = path.startsWith('/')
        ? join(repoRoot, path)
        : resolve(dirname(absolute), path);
      if (!existsExact(resolve(resolved))) {
        errors.push(`${file}: broken link -> ${target}`);
        continue;
      }
      if (
        anchor &&
        extname(resolved) === '.md' &&
        !getAnchors(resolved).has(anchor)
      ) {
        errors.push(
          `${file}: missing anchor #${anchor} in ${basename(resolved)}`
        );
      }
    }
  }
  return { files: files.length, errors };
};

// The files that instruct an agent: a stale path there sends the agent to a
// file that does not exist.
export const isAgentInstructionFile = (file: string): boolean =>
  extname(file) === '.md' &&
  (basename(file) === 'AGENTS.md' ||
    file.startsWith('.claude/agents/') ||
    file.startsWith('.claude/skills/') ||
    file.startsWith('skills/'));

const codeSpanRe = /`([^`\s]+)`/g;
const placeholderRe = /[*?<>{}[\]$|]|\.\.\./;

export type CodePathOptions = {
  // The top-level directories of the repository. A code span names a path
  // only when its first segment is one of them.
  topDirs: ReadonlySet<string>;
  // A path that git ignores is a generated file, so it may be absent.
  isIgnored: (path: string) => boolean;
};

// Checks that each code span in the given files that names a repository path,
// such as `docs/release-process.md`, points to a file or directory that
// exists. A path resolves from the repository root or from the file's own
// directory. Code spans with placeholders or globs are skipped.
export const checkCodePaths = (
  files: readonly string[],
  repoRoot: string,
  { topDirs, isIgnored }: CodePathOptions
): CheckResult => {
  const errors: string[] = [];
  for (const file of files) {
    const absolute = resolve(repoRoot, file);
    stripFences(readFileSync(absolute, 'utf8')).forEach((line, index) => {
      for (const [, span] of line.matchAll(codeSpanRe)) {
        const token = span.replace(/[.,:;)]+$/, '');
        const path = token.split(/[:#]/)[0];
        if (!topDirs.has(path.split('/')[0]) || !path.includes('/')) continue;
        if (placeholderRe.test(path)) continue;
        if (
          existsExact(resolve(repoRoot, path)) ||
          existsExact(resolve(dirname(absolute), path)) ||
          isIgnored(path)
        ) {
          continue;
        }
        errors.push(
          `${file}:${index + 1}: \`${token}\` names a path that does not exist`
        );
      }
    });
  }
  return { files: files.length, errors };
};
