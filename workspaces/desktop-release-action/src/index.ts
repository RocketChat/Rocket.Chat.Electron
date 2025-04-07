import { promises } from 'fs';
import { basename } from 'path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import type { PushEvent } from '@octokit/webhooks-types';
import fg from 'fast-glob';
import type { SemVer } from 'semver';
import { parse } from 'semver';

import {
  getDevelopmentRelease,
  getReleaseAssets,
  getSnapshotRelease,
  getTaggedRelease,
  overrideAsset,
} from './github';
import { findAndUploadSnaps, packOnLinux, setupSnapcraft } from './linux';
import { disableSpotlightIndexing, packOnMacOS } from './macos';
import { packOnWindows } from './windows';

const pack = async () => {
  switch (process.platform) {
    case 'linux':
      // Setup snapcraft early to check credentials
      await setupSnapcraft();
      await packOnLinux();
      break;

    case 'darwin':
      await disableSpotlightIndexing();
      await packOnMacOS();
      break;

    case 'win32':
      await packOnWindows();
      break;
  }
};

const getFilesToUpload = () =>
  fg([
    'dist/latest-linux.yml',
    'dist/*.tar.gz',
    'dist/*.snap',
    'dist/*.deb',
    'dist/*.rpm',
    'dist/latest-mac.yml',
    'dist/*.pkg',
    'dist/*.zip',
    'dist/*.dmg',
    'dist/*.dmg.blockmap',
    'dist/mas-universal/*.pkg',
    'dist/latest.yml',
    'dist/*.appx',
    'dist/*.msi',
    'dist/*.exe',
    'dist/*.exe.blockmap',
  ]);

const releaseDevelopment = async (commitSha: string) => {
  await pack();

  const release = await getDevelopmentRelease(commitSha);
  const assets = await getReleaseAssets(release.id);

  for (const path of await getFilesToUpload()) {
    const name = basename(path);
    const { size } = await promises.stat(path);
    const data = await promises.readFile(path);

    await overrideAsset(release, assets, name, size, data);
  }
  
  // Upload snaps to edge channel for development builds
  if (process.platform === 'linux') {
    await findAndUploadSnaps('development-build');
  }
};

const releaseSnapshot = async (commitSha: string) => {
  await pack();

  const release = await getSnapshotRelease(commitSha);
  const assets = await getReleaseAssets(release.id);

  for (const path of await getFilesToUpload()) {
    const name = basename(path);
    const { size } = await promises.stat(path);
    const data = await promises.readFile(path);

    await overrideAsset(release, assets, name, size, data);
  }
  
  // Upload snaps to beta channel for snapshot builds
  if (process.platform === 'linux') {
    await findAndUploadSnaps('beta-snapshot');
  }
};

const releaseTagged = async (version: SemVer, commitSha: string) => {
  await pack();

  const release = await getTaggedRelease(version, commitSha);

  if (!release.draft) {
    throw new Error(`not updating a published release`);
  }

  const assets = await getReleaseAssets(release.id);

  for (const path of await getFilesToUpload()) {
    const name = basename(path);
    const { size } = await promises.stat(path);
    const data = await promises.readFile(path);

    await overrideAsset(release, assets, name, size, data);
  }
  
  // Upload snaps with appropriate channel based on version
  if (process.platform === 'linux') {
    await findAndUploadSnaps(version.version);
  }
};

const start = async () => {
  if (github.context.eventName !== 'push') {
    core.warning(
      `this action should be used in push events (eventName="${github.context.eventName}")`
    );
    return;
  }

  const payload = github.context.payload as PushEvent;
  const ref = core.getInput('ref') || payload.ref;

  if (ref === 'refs/heads/develop') {
    core.info(
      `push event on develop branch detected, performing development release`
    );
    await releaseDevelopment(payload.after);
    return;
  }

  if (ref === 'refs/heads/master') {
    core.info(
      `push event on master branch detected, performing snapshot release`
    );
    await releaseSnapshot(payload.after);
    return;
  }

  if (ref.match(/^refs\/tags\//)) {
    const tag = ref.slice('refs/tags/'.length);
    const version = parse(tag);

    if (version) {
      core.info(
        `push event with tag detected (tag="${version.version}"), performing tagged release`
      );
      await releaseTagged(version, payload.after);
      return;
    }

    core.info(
      `push event with non-semantic tag detected (tag="${tag}"), performing snapshot release`
    );
    await releaseSnapshot(payload.after);
    return;
  }

  core.warning(
    `push event without relevant ref (ref="${ref}"), skipping release`
  );
};

start().catch((error) => {
  core.setFailed(error?.message);
});
