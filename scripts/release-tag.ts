import { execSync, execFileSync } from 'child_process';
import { createInterface } from 'readline';
import { parse, SemVer } from 'semver';
import { readFileSync } from 'fs';
import { join } from 'path';

import { evaluateTag, getChannel, normalizeTag } from './releaseTag.lib';

const REPO_URL = 'https://github.com/RocketChat/Rocket.Chat.Electron';

type Flags = {
  yes: boolean;
  force: boolean;
  allowUnverifiedRef: boolean;
  help: boolean;
};

const parseFlags = (argv: string[]): Flags => ({
  yes:
    argv.includes('--yes') || argv.includes('-y') || process.env.CI === 'true',
  force: argv.includes('--force'),
  allowUnverifiedRef: argv.includes('--allow-unverified-ref'),
  help: argv.includes('--help') || argv.includes('-h'),
});

const printHelp = (): void => {
  console.log(`
  Release Tag Creator

  Usage: yarn release:tag [options]

  Options:
    -y, --yes                Skip the confirmation prompt (also honored
                              automatically when CI=true).
    --force                  Allow tagging a version that is not greater
                              than the latest release in its channel
                              (prints a warning instead of exiting).
    --allow-unverified-ref    Allow tagging when HEAD is not an ancestor of
                              any allowed remote ref for the version's
                              channel (prints a warning instead of exiting).
                              Use only for intentional releases cut outside
                              the normal branches (e.g. hotfix branches).
    -h, --help                Show this help message.
`);
};

const getVersion = (): string => {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );
  return packageJson.version;
};

const exec = (cmd: string): string | null => {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
};

const fetchTags = (): void => {
  console.log('Fetching tags from remote...');
  execSync('git fetch --tags', { stdio: 'inherit' });
};

const getExistingTags = (): string[] => {
  const output = exec('git tag -l');
  if (output === null) {
    console.error('  Warning: Failed to list git tags');
    return [];
  }
  if (!output) return [];
  return output.split('\n').filter(Boolean).map(normalizeTag);
};

const getHeadSha = (): string | null => exec('git rev-parse HEAD');

const getRemoteReleaseBranches = (): string[] => {
  console.log('Listing remote release branches...');
  const output = exec("git ls-remote --heads origin 'release/*'");
  if (!output) return [];
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/refs\/heads\/(release\/\S+)$/);
      return match ? match[1] : null;
    })
    .filter((branch): branch is string => branch !== null);
};

const fetchRef = (ref: string): boolean => {
  console.log(`Fetching origin ${ref}...`);
  try {
    execSync(`git fetch origin ${ref}`, { stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
};

const isHeadAncestorOf = (remoteRef: string): boolean => {
  try {
    execSync(`git merge-base --is-ancestor HEAD ${remoteRef}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
};

type ChannelRefCheck = {
  ok: boolean;
  checkedRefs: string[];
  missingRefs: string[];
};

const checkHeadAgainstChannelRefs = (channel: string): ChannelRefCheck => {
  const isPrerelease = channel !== 'stable';
  const primaryBranch = isPrerelease ? 'dev' : 'master';

  const releaseBranches = getRemoteReleaseBranches();

  const missingRefs: string[] = [];
  const checkedRefs: string[] = [];

  if (fetchRef(primaryBranch)) {
    checkedRefs.push(`origin/${primaryBranch}`);
  } else {
    missingRefs.push(`origin/${primaryBranch}`);
  }

  for (const branch of releaseBranches) {
    if (fetchRef(branch)) {
      checkedRefs.push(`origin/${branch}`);
    } else {
      missingRefs.push(`origin/${branch}`);
    }
  }

  if (missingRefs.length > 0 && checkedRefs.length === 0) {
    console.error(
      `\n  Error: Could not fetch any allowed ref for the "${channel}" channel.`
    );
    console.error(`    Missing: ${missingRefs.join(', ')}`);
    process.exit(1);
  }

  const ok = checkedRefs.some((ref) => isHeadAncestorOf(ref));

  return { ok, checkedRefs, missingRefs };
};

const prompt = (question: string): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
};

const main = async (): Promise<void> => {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  console.log('\n  Release Tag Creator\n');

  // 1. Read version from package.json
  const versionString = getVersion();
  const parsed = parse(versionString);

  if (!parsed) {
    console.error(`Error: Invalid version in package.json: ${versionString}`);
    process.exit(1);
  }

  const version: SemVer = parsed;

  // 2. Detect channel
  const channel = getChannel(version);

  console.log(`  Version:  ${version.version}`);
  console.log(`  Channel:  ${channel}`);
  console.log(`  Tag:      ${version.version}`);
  console.log('');

  // 3. Verify HEAD is contained in an allowed ref for this channel
  const refCheck = checkHeadAgainstChannelRefs(channel);

  if (!refCheck.ok) {
    const headSha = getHeadSha() ?? 'unknown';
    const isPrerelease = channel !== 'stable';
    const primaryRefLabel = isPrerelease ? 'origin/dev' : 'origin/master';

    if (flags.allowUnverifiedRef) {
      console.warn(
        `\n  WARNING: HEAD (${headSha}) is not an ancestor of any allowed ref for the "${channel}" channel.`
      );
      console.warn(`  Checked: ${refCheck.checkedRefs.join(', ') || 'none'}`);
      if (refCheck.missingRefs.length > 0) {
        console.warn(`  Could not fetch: ${refCheck.missingRefs.join(', ')}`);
      }
      console.warn(
        `  Proceeding anyway because --allow-unverified-ref was passed.\n`
      );
    } else {
      console.error(
        `\n  Error: HEAD is not contained in any allowed ref for the "${channel}" channel.`
      );
      console.error(`    HEAD:      ${headSha}`);
      console.error(
        `    Checked:   ${refCheck.checkedRefs.join(', ') || 'none'}`
      );
      if (refCheck.missingRefs.length > 0) {
        console.error(
          `    Could not fetch: ${refCheck.missingRefs.join(', ')}`
        );
      }
      console.error(
        `\n  Prerelease tags (alpha/beta/rc) are cut from origin/dev or an`
      );
      console.error(
        `  origin/release/* branch. Stable tags are cut from origin/master or`
      );
      console.error(
        `  an origin/release/* branch. Tagging from anywhere else ships the`
      );
      console.error(
        `  wrong tree (e.g. a pre-merge bump commit instead of the squashed`
      );
      console.error(
        `  merge commit). Merge/push to ${primaryRefLabel} first, then`
      );
      console.error(
        `  re-run this script from the up-to-date branch. If this is an`
      );
      console.error(
        `  intentional release cut outside those branches, re-run with`
      );
      console.error(`  --allow-unverified-ref.\n`);
      process.exit(1);
    }
  }

  // 4. Fetch tags
  fetchTags();

  // 5. Evaluate tag (existing-tag check + channel regression)
  const existingTags = getExistingTags();
  const result = evaluateTag({
    version,
    existingTags,
    force: flags.force,
  });

  if (!result.ok) {
    console.error(`\n  Error: ${result.error}\n`);
    process.exit(1);
  }

  console.log(`  Tag does not exist yet`);

  if (result.warning) {
    console.warn(`\n  WARNING: ${result.warning}`);
    console.warn(`  Proceeding anyway because --force was passed.\n`);
  } else if (result.latestInChannel) {
    console.log(`  Latest ${channel}: ${result.latestInChannel.version}`);
  } else {
    console.log(`  First ${channel} release`);
  }

  // 6. Show confirmation
  console.log('\n  This will:');
  console.log(`    1. Create git tag: ${version.version}`);
  console.log(`    2. Push tag to origin`);
  console.log(`    3. Trigger GitHub Actions build-release workflow\n`);

  if (!flags.yes) {
    const answer = await prompt('  Proceed? (y/N): ');

    if (answer !== 'y' && answer !== 'yes') {
      console.log('\n  Aborted.\n');
      process.exit(0);
    }
  }

  // 7. Create and push tag
  console.log(`\n  Creating tag ${version.version}...`);
  try {
    execFileSync('git', ['tag', '--', version.version], {
      stdio: 'inherit',
    });
  } catch {
    console.error(`  Error: Failed to create tag`);
    process.exit(1);
  }

  console.log(`  Pushing tag to origin...`);
  try {
    execFileSync('git', ['push', 'origin', `refs/tags/${version.version}`], {
      stdio: 'inherit',
    });
  } catch {
    console.error(`  Error: Failed to push tag`);
    console.error(
      `  The local tag was created. You may need to push it manually.`
    );
    process.exit(1);
  }

  // 8. Success message
  console.log(`\n  Tag created and pushed successfully!\n`);
  console.log(`  Monitor build: ${REPO_URL}/actions`);
  console.log(`  Releases:      ${REPO_URL}/releases\n`);
};

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
