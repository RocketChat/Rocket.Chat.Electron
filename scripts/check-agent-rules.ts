import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

import { parse as parseYaml } from 'yaml';

import {
  checkBundleVersionBump,
  checkBundleVersionFormat,
  checkEwsjsPatchLocation,
  checkUpdateMetadataUploaders,
  Finding,
  formatFinding,
  PatchFile,
  VersionPair,
} from './agentRules.lib';

const REPO_ROOT = resolve(__dirname, '..');
const WORKFLOW_PATH = '.github/workflows/build-release.yml';
const ACTION_PATH = 'workspaces/desktop-release-action/action.yml';

const HELP = `
  Agent rules check (runs as part of yarn lint)

  Usage: yarn .:lint:agent-rules [--root <dir>] [--base <ref>]

  --root <dir>   Read the checked files from <dir> instead of this repository.
  --base <ref>   Git ref to compare package.json / electron-builder.json
                 against. Defaults to AGENT_RULES_BASE_REF, then HEAD^1 on
                 GitHub Actions (the base side of a pull request merge
                 commit), then the merge-base of HEAD and origin/dev.
`;

const argValue = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const git = (args: string[]): string | null => {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
};

const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

const readPatchPackageFiles = (root: string): PatchFile[] => {
  const dir = join(root, 'patches');
  if (!existsSync(dir)) return [];
  return listFiles(dir).map((path) => ({
    path: relative(root, path).split('\\').join('/'),
    content: readFileSync(path, 'utf-8'),
  }));
};

const readUploadDefault = (root: string): string => {
  const path = join(root, ACTION_PATH);
  if (!existsSync(path)) return 'true';
  const action = parseYaml(readFileSync(path, 'utf-8'));
  const fallback = action?.inputs?.upload_update_metadata?.default;
  return fallback === undefined ? 'true' : String(fallback);
};

const readVersionPair = (
  read: (file: string) => string | null
): VersionPair | null => {
  const pkg = read('package.json');
  const builder = read('electron-builder.json');
  if (pkg === null || builder === null) return null;
  return {
    version: JSON.parse(pkg).version,
    bundleVersion: JSON.parse(builder).mac?.bundleVersion,
  };
};

type BaseRef = { ref: string; label: string } | { skip: string };

const resolveBaseRef = (): BaseRef => {
  const explicit = argValue('--base') ?? process.env.AGENT_RULES_BASE_REF;
  if (explicit) return { ref: explicit, label: explicit };

  if (process.env.GITHUB_ACTIONS === 'true') {
    const parent = git(['rev-parse', '--verify', '--quiet', 'HEAD^1']);
    return parent
      ? { ref: parent, label: 'HEAD^1' }
      : { skip: 'HEAD^1 is not in this clone (checkout needs fetch-depth: 2)' };
  }

  const mergeBase = git(['merge-base', 'HEAD', 'origin/dev']);
  return mergeBase
    ? { ref: mergeBase, label: 'merge-base with origin/dev' }
    : { skip: 'origin/dev is not available; pass --base <ref>' };
};

const annotate = ({ rule, severity, message }: Finding): void => {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  console.log(`::${severity} title=agent-rules ${rule}::${message}`);
};

const main = (): void => {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP);
    return;
  }

  const root = resolve(argValue('--root') ?? REPO_ROOT);
  const readHead = (file: string): string | null => {
    const path = join(root, file);
    return existsSync(path) ? readFileSync(path, 'utf-8') : null;
  };

  const findings: Finding[] = [];
  const notes: string[] = [];

  findings.push(...checkEwsjsPatchLocation(readPatchPackageFiles(root)));

  const workflow = readHead(WORKFLOW_PATH);
  if (workflow === null) {
    notes.push(`${WORKFLOW_PATH} not found; update metadata check skipped`);
  } else {
    findings.push(
      ...checkUpdateMetadataUploaders(workflow, {
        uploadDefault: readUploadDefault(root),
        workflowPath: WORKFLOW_PATH,
      })
    );
  }

  const head = readVersionPair(readHead);
  if (head === null) {
    notes.push('package.json or electron-builder.json not found');
  } else {
    findings.push(...checkBundleVersionFormat(head.bundleVersion));

    const base = resolveBaseRef();
    if ('skip' in base) {
      notes.push(`bundleVersion bump comparison skipped: ${base.skip}`);
    } else {
      const basePair = readVersionPair((file) =>
        git(['show', `${base.ref}:${file}`])
      );
      if (basePair === null) {
        notes.push(
          `bundleVersion bump comparison skipped: cannot read files at ${base.label}`
        );
      } else {
        findings.push(...checkBundleVersionBump(basePair, head));
        notes.push(
          `compared version/bundleVersion against ${base.label} ` +
            `(${basePair.version} / ${String(basePair.bundleVersion)})`
        );
      }
    }
  }

  notes.forEach((note) => console.log(`agent-rules: ${note}`));
  findings.forEach((finding) => {
    annotate(finding);
    (finding.severity === 'error' ? console.error : console.warn)(
      formatFinding(finding)
    );
  });

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  console.log(
    `agent-rules: ${errors} error(s), ${warnings} warning(s). Rules: AGENTS.md "Rule | Enforced by".`
  );
  if (errors > 0) process.exitCode = 1;
};

main();
