#!/usr/bin/env node

// Lists every change between the last stable tag and dev, classifies it for
// QA, and checks that a release QA pack covers all of it.
//
//   node skills/release-qa-plan/collect-changes.mjs [options]
//
//   --base <tag>     last stable tag (default: highest X.Y.Z tag)
//   --head <ref>     branch to promote (default: origin/dev)
//   --build <tag>    tag of the build under test (default: tag at head, else
//                    the newest prerelease tag that is an ancestor of head)
//   --format md|json output format (default: md)
//   --check <pack>   verify qa/<pack> covers the range; exit 1 on a gap
//   --no-gh          skip the GitHub PR data (offline; weaker output)
//
// Read-only: git commands plus one `gh api graphql` query that loads every
// PR in the range (title, body, labels, files, author). The PR bodies give
// the intent and the author's verification notes, and the stable-line PR
// bodies name the dev PRs they cherry-pick. Run `git fetch origin --tags`
// first.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PR_FIELDS = `number title url body author { login }
  labels(first: 20) { nodes { name } }
  files(first: 100) { totalCount }`;

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const git = (gitArgs, input) => {
  const result = spawnSync('git', gitArgs, {
    encoding: 'utf8',
    input,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ${gitArgs.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
};
const lines = (text) => text.split('\n').filter(Boolean);
const isAncestor = (ancestor, descendant) =>
  spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant])
    .status === 0;

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const compareSemver = (a, b) => {
  const [, ...pa] = a.match(SEMVER);
  const [, ...pb] = b.match(SEMVER);
  for (let i = 0; i < 3; i++) {
    if (Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) - Number(pb[i]);
  }
  if (!pa[3] && !pb[3]) return 0;
  if (!pa[3]) return 1;
  if (!pb[3]) return -1;
  return pa[3].localeCompare(pb[3], undefined, { numeric: true });
};

const tags = lines(git(['tag', '--list'])).filter((tag) => SEMVER.test(tag));
const head = option('head', 'origin/dev');
const headSha = git(['rev-parse', head]).trim();
const base =
  option('base') ||
  tags
    .filter((tag) => !tag.match(SEMVER)[4])
    .sort(compareSemver)
    .at(-1);

const resolveBuild = () => {
  const explicit = option('build');
  if (explicit) return explicit;
  const atHead = lines(git(['tag', '--points-at', headSha])).filter((tag) =>
    SEMVER.test(tag)
  );
  if (atHead.length) return atHead.sort(compareSemver).at(-1);
  return (
    tags
      .filter((tag) => tag.match(SEMVER)[4] && compareSemver(tag, base) > 0)
      .filter((tag) => isAncestor(tag, headSha))
      .sort(compareSemver)
      .at(-1) ?? null
  );
};

const mergeBase = git(['merge-base', base, headSha]).trim();
const build = resolveBuild();

const TEST_FILE = /(\.spec\.[jt]sx?$|__tests__\/|__mocks__\/|^jest\.config)/;
const PACKAGING_FILE =
  /^(electron-builder\.json|package\.json|yarn\.lock|rollup\.config\.\w+|build\/|patches\/|\.yarn\/|workspaces\/desktop-release-action\/|\.github\/workflows\/build-release\.yml)/;
const TOOLING_FILE =
  /(^(\.claude\/|\.github\/|\.husky\/|\.vscode\/|docs\/|qa\/|skills\/|scripts\/|\.[^/]+$)|\.md$)/;
const SCANNED_FILE =
  /^(src\/|electron-builder\.json$|\.github\/workflows\/build-release\.yml$)/;

const classifyFile = (file) => {
  if (TEST_FILE.test(file)) return 'test';
  if (PACKAGING_FILE.test(file)) return 'packaging';
  if (TOOLING_FILE.test(file)) return 'tooling';
  return 'runtime';
};

const areaOf = (file) => {
  const parts = file.split('/').slice(0, -1);
  if (parts[0] !== 'src') return parts[0] ?? file;
  const depth = ['ui', 'public'].includes(parts[1]) ? 4 : 2;
  return parts.slice(1, depth).join('/') || 'src/*';
};

const PLATFORM_PATTERNS = [
  [/process\.mas\b/, 'mas'],
  [/windowsStore\b/, 'appx'],
  [/\bAPPIMAGE\b/, 'appimage'],
  [/\bSNAP\b|\bsnap\b/, 'snap'],
  [/\bflatpak\b/i, 'flatpak'],
];
const PLATFORM_NAMES = { darwin: 'macos', win32: 'windows', linux: 'linux' };

const platformsOf = (files, patch) => {
  const found = new Set();
  for (const file of files) {
    for (const segment of file.split(/[/.]/)) {
      if (PLATFORM_NAMES[segment]) found.add(PLATFORM_NAMES[segment]);
    }
  }
  for (const line of patch.split('\n')) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const [, name] of line.matchAll(
      /process\.platform\s*[!=]==?\s*'(\w+)'/g
    )) {
      if (PLATFORM_NAMES[name]) found.add(PLATFORM_NAMES[name]);
    }
    for (const [pattern, name] of PLATFORM_PATTERNS) {
      if (pattern.test(line)) found.add(name);
    }
  }
  return [...found].sort();
};

const normalizeSubject = (subject) =>
  subject
    .replace(/\(#\d+\)/g, '')
    .replace(/,\s*release\s+[\d.]+/gi, '')
    .replace(/\[?\(?\b[A-Z][A-Z0-9]+-\d+\b\)?\]?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const words = (text) => new Set(text.match(/[a-z0-9]{3,}/g) ?? []);
const similarity = (a, b) => {
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((word) => wb.has(word)).length;
  return shared / Math.max(1, new Set([...wa, ...wb]).size);
};

const patchIds = (range) => {
  const ids = new Map();
  const output = git(
    ['patch-id', '--stable'],
    git(['log', '-p', '--no-merges', range])
  );
  for (const line of lines(output)) {
    const [patchId, sha] = line.split(' ');
    ids.set(sha, patchId);
  }
  return ids;
};

const readCommits = (range) =>
  lines(
    git([
      'log',
      '--no-merges',
      '--reverse',
      '--format=%H%x1f%h%x1f%s%x1f%an',
      range,
    ])
  ).map((line) => {
    const [sha, short, subject, author] = line.split('\x1f');
    return { sha, short, subject, author };
  });

const prNumberOf = (subject) => subject.match(/\(#(\d+)\)\s*$/)?.[1] ?? null;

const repoSlug = () => {
  const url = git(['remote', 'get-url', 'origin']).trim();
  const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) throw new Error(`origin is not a GitHub remote: ${url}`);
  return { owner: match[1], name: match[2] };
};

const loadPullRequests = (numbers) => {
  if (args.includes('--no-gh') || numbers.length === 0) return new Map();
  const { owner, name } = repoSlug();
  const fields = numbers
    .map(
      (number) => `pr${number}: pullRequest(number: ${number}) { ${PR_FIELDS} }`
    )
    .join('\n');
  const query = `query { repository(owner: "${owner}", name: "${name}") { ${fields} } }`;
  const result = spawnSync('gh', ['api', 'graphql', '-f', `query=${query}`], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `gh api graphql failed: ${result.stderr.trim()}. Run \`gh auth status\`, or pass --no-gh to skip the PR data.`
    );
  }
  const {
    data: { repository },
  } = JSON.parse(result.stdout);
  return new Map(
    Object.values(repository)
      .filter(Boolean)
      .map((pr) => [String(pr.number), pr])
  );
};

const stripGenerated = (body) =>
  (body ?? '')
    .replace(/<!--[\s\S]*?-->/g, (comment) =>
      /auto-generated/i.test(comment) ? '\u0000' : ''
    )
    .split('\u0000')[0]
    .replace(/\r/g, '')
    .trim();

const sectionsOf = (body) => {
  const sections = [];
  let current = { heading: '', text: [] };
  for (const line of body.split('\n')) {
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      sections.push(current);
      current = { heading: heading[1].trim(), text: [] };
    } else {
      current.text.push(line);
    }
  }
  sections.push(current);
  return sections
    .map((section) => ({ ...section, text: section.text.join('\n').trim() }))
    .filter((section) => section.text);
};

const clip = (text, max) =>
  text.length > max ? `${text.slice(0, max).trimEnd()} …` : text;

const digestOf = (pr) => {
  if (!pr) return null;
  const sections = sectionsOf(stripGenerated(pr.body));
  const pick = (pattern) =>
    sections
      .filter((section) => pattern.test(section.heading))
      .map((section) => section.text)
      .join('\n\n');
  const summary =
    pick(/summary|problem|why|context|change/i) || sections[0]?.text || '';
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    author: pr.author?.login ?? null,
    labels: pr.labels.nodes.map((label) => label.name),
    fileCount: pr.files.totalCount,
    summary: clip(summary, 500),
    testNotes: clip(
      pick(/verif|test|qa|how to|manual|screenshot|known limitation/i),
      700
    ),
    body: stripGenerated(pr.body),
  };
};

const stableCommits = readCommits(`${mergeBase}..${base}`);
const stablePatchIds = new Set(patchIds(`${mergeBase}..${base}`).values());
const headPatchIds = patchIds(`${mergeBase}..${headSha}`);
const buildSha = build ? git(['rev-parse', `${build}^{commit}`]).trim() : null;

const headCommitList = readCommits(`${mergeBase}..${headSha}`);
const pullRequests = loadPullRequests(
  [...headCommitList, ...stableCommits]
    .map((commit) => prNumberOf(commit.subject))
    .filter(Boolean)
);
const stableReferences = stableCommits.map((stable) => {
  const pr = pullRequests.get(prNumberOf(stable.subject) ?? '');
  const text = `${stable.subject}\n${pr?.title ?? ''}\n${stripGenerated(pr?.body)}`;
  return {
    stable,
    references: new Set(
      [...text.matchAll(/#(\d+)\b/g)].map(([, number]) => number)
    ),
  };
});

const shippedIn = (commit) => {
  const pr = prNumberOf(commit.subject);
  const referenced = stableReferences.find(
    ({ stable, references }) =>
      pr && references.has(pr) && prNumberOf(stable.subject) !== pr
  );
  if (referenced) {
    return {
      match: 'pr-reference',
      commit: referenced.stable.short,
      subject: referenced.stable.subject,
    };
  }
  if (stablePatchIds.has(headPatchIds.get(commit.sha))) {
    return { match: 'patch-id' };
  }
  const subject = normalizeSubject(commit.subject);
  for (const stable of stableCommits) {
    const stableSubject = normalizeSubject(stable.subject);
    if (stableSubject === subject) {
      return {
        match: 'subject',
        commit: stable.short,
        subject: stable.subject,
      };
    }
    if (similarity(stableSubject, subject) >= 0.5) {
      return {
        match: 'similar-subject',
        commit: stable.short,
        subject: stable.subject,
      };
    }
  }
  return null;
};

const commits = headCommitList.map((commit) => {
  const files = lines(git(['show', '--format=', '--name-only', commit.sha]));
  const kinds = new Set(files.map(classifyFile));
  const categoryOf = () => {
    if (/^chore: bump version to /.test(commit.subject)) return 'version-bump';
    if (kinds.has('runtime')) return 'user-facing';
    if (kinds.has('packaging')) return 'packaging';
    return 'no-runtime';
  };
  const category = categoryOf();
  const runtimeFiles = files.filter((file) =>
    ['runtime', 'packaging'].includes(classifyFile(file))
  );
  const scannedFiles = runtimeFiles.filter((file) => SCANNED_FILE.test(file));
  const patch = scannedFiles.length
    ? git(['show', '--format=', '-U0', commit.sha, '--', ...scannedFiles])
    : '';
  return {
    ...commit,
    pr: prNumberOf(commit.subject),
    pullRequest: digestOf(pullRequests.get(prNumberOf(commit.subject) ?? '')),
    tickets: [
      ...new Set(commit.subject.match(/\b[A-Z][A-Z0-9]+-\d+\b/g) ?? []),
    ],
    category,
    needsCoverage: ['user-facing', 'packaging'].includes(category),
    areas: [...new Set(runtimeFiles.map(areaOf))].sort(),
    platforms: platformsOf(runtimeFiles, patch),
    files,
    inBuild: buildSha ? isAncestor(commit.sha, buildSha) : false,
    shippedInStable: shippedIn(commit),
  };
});

const missingFromBuild = commits.filter(
  (commit) => commit.needsCoverage && !commit.inBuild
);
const reference = (commit) => (commit.pr ? `#${commit.pr}` : commit.short);
const report = {
  base,
  head,
  headSha,
  mergeBase,
  mergeBaseSubject: git(['log', '-1', '--format=%s', mergeBase]).trim(),
  build,
  buildSha,
  buildIsHead: buildSha === headSha,
  counts: Object.fromEntries(
    ['user-facing', 'packaging', 'no-runtime', 'version-bump'].map((name) => [
      name,
      commits.filter((commit) => commit.category === name).length,
    ])
  ),
  missingFromBuild: missingFromBuild.map(reference),
  commits,
};

const check = (packArg) => {
  const pack = path.resolve(packArg);
  const readme = path.join(pack, 'README.md');
  const errors = [];
  if (!fs.existsSync(readme)) {
    console.error(`FAIL ${packArg}: README.md is missing`);
    process.exit(1);
  }
  const flowsDir = path.join(pack, 'flows');
  const texts = [
    fs.readFileSync(readme, 'utf8'),
    ...(fs.existsSync(flowsDir)
      ? fs
          .readdirSync(flowsDir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => fs.readFileSync(path.join(flowsDir, file), 'utf8'))
      : []),
  ].join('\n');
  const referenced = new Set(
    [...texts.matchAll(/#(\d+)\b/g)].map(([, number]) => `#${number}`)
  );

  if (!build) {
    errors.push(`no prerelease tag after ${base} is an ancestor of ${head}`);
  } else if (
    !fs.readFileSync(readme, 'utf8').includes(`Build under test: ${build}`)
  ) {
    errors.push(
      `README.md must contain "Build under test: ${build}" (the newest build for this range)`
    );
  }
  if (missingFromBuild.length) {
    errors.push(
      `${build ?? 'the build'} does not contain ${missingFromBuild.length} change(s) that need QA: ${report.missingFromBuild.join(', ')}. Cut a new prerelease, then update the pack.`
    );
  }
  const uncovered = commits.filter(
    (commit) =>
      commit.needsCoverage &&
      !(commit.pr
        ? referenced.has(`#${commit.pr}`)
        : texts.includes(commit.short))
  );
  for (const commit of uncovered) {
    errors.push(`not covered: ${reference(commit)} ${commit.subject}`);
  }

  const covered = commits.filter((commit) => commit.needsCoverage).length;
  if (errors.length) {
    console.error(`FAIL ${packArg} (${base}..${head}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(
    `PASS ${packArg}: ${covered} change(s) from ${base}..${head} covered, build ${build}`
  );
};

const cell = (text) => String(text).replace(/\|/g, '\\|');
const shippedLabel = (shipped) => {
  if (!shipped) return 'no';
  if (shipped.match === 'similar-subject') {
    return `maybe (${shipped.commit}, verify)`;
  }
  return `yes (${shipped.commit ?? shipped.match})`;
};
const buildNote = () => {
  if (report.buildIsHead) return ' (equals head)';
  if (missingFromBuild.length) {
    return ` — MISSING ${missingFromBuild.length} change(s) that need QA: ${report.missingFromBuild.join(', ')}`;
  }
  return ' (head has only non-runtime changes after it)';
};

const printMarkdown = () => {
  const out = [];
  out.push(`# Release QA input: ${base} → ${head}`, '');
  out.push(`- Last stable: ${base}`);
  out.push(`- Head: ${head} @ ${headSha.slice(0, 9)}`);
  out.push(
    `- Merge base: ${mergeBase.slice(0, 9)} (${report.mergeBaseSubject})`
  );
  out.push(`- Build under test: ${build ?? 'NONE'}${buildNote()}`);
  out.push(
    `- Commits: ${commits.length} — ${Object.entries(report.counts)
      .map(([name, count]) => `${name} ${count}`)
      .join(', ')}`,
    ''
  );
  out.push('## Changes that need QA coverage', '');
  out.push(
    '| Ref | Subject | Category | Areas | Platforms | Shipped in stable |'
  );
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const commit of commits.filter((item) => item.needsCoverage)) {
    out.push(
      `| ${reference(commit)} | ${cell(commit.subject)} | ${commit.category} | ${cell(commit.areas.join(', '))} | ${commit.platforms.join(', ') || 'all'} | ${shippedLabel(commit.shippedInStable)} |`
    );
  }
  out.push('', '## PR digests', '');
  out.push(
    'Read the full PR before you write its flow: `gh pr view <N> --json title,body,files,comments,reviews`. The digest only points at it.',
    ''
  );
  for (const commit of commits.filter((item) => item.needsCoverage)) {
    const pr = commit.pullRequest;
    out.push(`### ${reference(commit)} ${pr?.title ?? commit.subject}`, '');
    if (!pr) {
      out.push('No PR data (no PR number, or --no-gh).', '');
      continue;
    }
    out.push(
      `- ${pr.url} — @${pr.author}, ${pr.fileCount} files${pr.labels.length ? `, labels: ${pr.labels.join(', ')}` : ''}`,
      `- Shipped in stable: ${shippedLabel(commit.shippedInStable)}`,
      ''
    );
    const quote = (text) => text.split('\n').map((line) => `> ${line}`);
    if (pr.summary) out.push('**Summary**', '', ...quote(pr.summary), '');
    out.push(
      ...(pr.testNotes
        ? ['**Verification / test notes**', '', ...quote(pr.testNotes)]
        : ['**Verification / test notes:** none in the PR body.']),
      ''
    );
  }
  out.push('## Changes with no runtime effect (no flow needed)', '');
  out.push('| Ref | Subject | Category |');
  out.push('| --- | --- | --- |');
  for (const commit of commits.filter((item) => !item.needsCoverage)) {
    out.push(
      `| ${reference(commit)} | ${cell(commit.subject)} | ${commit.category} |`
    );
  }
  console.log(out.join('\n'));
};

if (option('check')) {
  check(option('check'));
} else if (option('format') === 'json') {
  console.log(JSON.stringify(report, null, 2));
} else {
  printMarkdown();
}
