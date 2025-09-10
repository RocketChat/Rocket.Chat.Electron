import { promises } from 'fs';
import { basename, extname } from 'path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import type { PushEvent } from '@octokit/webhooks-types';
import fg from 'fast-glob';
import type { SemVer } from 'semver';
import { parse } from 'semver';

import {
  clearStaleAssets,
  forceCleanOldAssets,
  getDevelopmentRelease,
  getReleaseAssets,
  getSnapshotRelease,
  getTaggedRelease,
  overrideAsset,
} from './github';
import { packOnLinux, setupSnapcraft, uploadSnap } from './linux';
import { disableSpotlightIndexing, packOnMacOS } from './macos';
import { packOnWindows } from './windows/index';

const pack = async () => {
  switch (process.platform) {
    case 'linux':
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
    'dist/*.AppImage',
    'dist/alpha.yml',
    'dist/alpha-mac.yml',
    'dist/alpha-linux.yml',
    'dist/beta.yml',
    'dist/beta-mac.yml',
    'dist/beta-linux.yml',
  ]);

const releaseDevelopment = async (commitSha: string) => {
  await pack();

  const release = await getDevelopmentRelease(commitSha);
  const existingAssets = await getReleaseAssets(release.id);
  
  // Force clean old assets if we have too many (close to GitHub's 1000 limit)
  if (existingAssets.length > 900) {
    core.info(`Release has ${existingAssets.length} assets, cleaning old assets to prevent GitHub limit`);
    await forceCleanOldAssets(release.id, 100);
  } else {
    const filesToUpload = await getFilesToUpload();
    const expectedAssetNames = filesToUpload.map(path => basename(path));
    await clearStaleAssets(release.id, expectedAssetNames);
  }
  
  const assets = await getReleaseAssets(release.id);

  for (const path of await getFilesToUpload()) {
    const name = basename(path);
    const extension = extname(path).toLowerCase();
    const { size } = await promises.stat(path);
    const data = await promises.readFile(path);

    await overrideAsset(release, assets, name, size, data);
    if (extension === '.snap') {
      await uploadSnap(path, 'edge');
    }
  }
};

const releaseSnapshot = async (commitSha: string) => {
  await pack();

  const release = await getSnapshotRelease(commitSha);
  const existingAssets = await getReleaseAssets(release.id);
  
  // Force clean old assets if we have too many (close to GitHub's 1000 limit)
  if (existingAssets.length > 900) {
    core.info(`Release has ${existingAssets.length} assets, cleaning old assets to prevent GitHub limit`);
    await forceCleanOldAssets(release.id, 100);
  } else {
    const filesToUpload = await getFilesToUpload();
    const expectedAssetNames = filesToUpload.map(path => basename(path));
    await clearStaleAssets(release.id, expectedAssetNames);
  }
  
  const assets = await getReleaseAssets(release.id);

  for (const path of await getFilesToUpload()) {
    const name = basename(path);
    const extension = extname(path).toLowerCase();
    const { size } = await promises.stat(path);
    const data = await promises.readFile(path);

    await overrideAsset(release, assets, name, size, data);
    if (extension === '.snap') {
      await uploadSnap(path, 'edge');
    }
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
    const extension = extname(path).toLowerCase();
    const { size } = await promises.stat(path);
    const data = await promises.readFile(path);

    await overrideAsset(release, assets, name, size, data);
    if (extension === '.snap') {
      await uploadSnap(
        path,
        (!version.prerelease && 'stable') ||
          (version.prerelease[0] === 'candidate' && 'candidate') ||
          (version.prerelease[0] === 'beta' && 'beta') ||
          'edge'
      );
    }
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
