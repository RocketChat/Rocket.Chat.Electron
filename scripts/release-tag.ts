import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { parse, gt, prerelease, SemVer } from 'semver';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_URL = 'https://github.com/RocketChat/Rocket.Chat.Electron';

const getVersion = (): string => {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );
  return packageJson.version;
};

const getChannel = (version: SemVer): string => {
  const pre = prerelease(version);
  if (!pre || pre.length === 0) return 'stable';
  if (pre[0] === 'alpha') return 'alpha';
  if (pre[0] === 'beta') return 'beta';
  if (pre[0] === 'rc' || pre[0] === 'candidate') return 'candidate';
  return 'prerelease';
};

const exec = (cmd: string): string | null => {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
};

const fetchTags = (): void => {
  console.log('Fetching tags from remote...');
  execSync('git fetch --tags', { stdio: 'inherit' });
};

const normalizeTag = (tag: string): string => {
  // Strip leading 'v' if present for consistent comparison
  return tag.startsWith('v') ? tag.slice(1) : tag;
};

const getExistingTags = (): string[] => {
  const output = exec('git tag -l');
  if (output === null) {
    console.error('  Warning: Failed to list git tags');
    return [];
  }
  if (!output) return [];
  // Return normalized tags (without 'v' prefix) for consistent comparison
  return output.split('\n').filter(Boolean).map(normalizeTag);
};

const getLatestTagForChannel = (tags: string[], channel: string): SemVer | null => {
  const channelTags = tags
    .map((tag) => parse(tag))
    .filter((v): v is SemVer => v !== null)
    .filter((v) => getChannel(v) === channel)
    .sort((a, b) => (gt(a, b) ? -1 : 1));

  return channelTags[0] || null;
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
  console.log('\n  Release Tag Creator\n');

  // 1. Read version from package.json
  const versionString = getVersion();
  const version = parse(versionString);

  if (!version) {
    console.error(`Error: Invalid version in package.json: ${versionString}`);
    process.exit(1);
  }

  // 2. Detect channel
  const channel = getChannel(version);

  console.log(`  Version:  ${version.version}`);
  console.log(`  Channel:  ${channel}`);
  console.log(`  Tag:      ${version.version}`);
  console.log('');

  // 3. Fetch tags
  fetchTags();

  // 4. Check if tag already exists
  const existingTags = getExistingTags();

  if (existingTags.includes(version.version)) {
    console.error(`\n  Error: Tag ${version.version} already exists!`);
    console.error(`  The version in package.json has already been released.`);
    console.error(`  Please bump the version before creating a new release.\n`);
    process.exit(1);
  }

  console.log(`  Tag does not exist yet`);

  // 5. Check if version is newer than latest in channel
  const latestInChannel = getLatestTagForChannel(existingTags, channel);

  if (latestInChannel && !gt(version, latestInChannel)) {
    console.warn(`\n  Warning: Version ${version.version} is not greater than`);
    console.warn(`  the latest ${channel} release (${latestInChannel.version}).`);
    console.warn(`  This may be intentional, but please verify.\n`);
  } else if (latestInChannel) {
    console.log(`  Latest ${channel}: ${latestInChannel.version}`);
  } else {
    console.log(`  First ${channel} release`);
  }

  // 6. Show confirmation
  console.log('\n  This will:');
  console.log(`    1. Create git tag: ${version.version}`);
  console.log(`    2. Push tag to origin`);
  console.log(`    3. Trigger GitHub Actions build-release workflow\n`);

  const answer = await prompt('  Proceed? (y/N): ');

  if (answer !== 'y' && answer !== 'yes') {
    console.log('\n  Aborted.\n');
    process.exit(0);
  }

  // 7. Create and push tag
  console.log(`\n  Creating tag ${version.version}...`);
  try {
    execSync(`git tag -- ${version.version}`, { stdio: 'inherit' });
  } catch {
    console.error(`  Error: Failed to create tag`);
    process.exit(1);
  }

  console.log(`  Pushing tag to origin...`);
  try {
    execSync(`git push origin tag -- ${version.version}`, { stdio: 'inherit' });
  } catch {
    console.error(`  Error: Failed to push tag`);
    console.error(`  The local tag was created. You may need to push it manually.`);
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
