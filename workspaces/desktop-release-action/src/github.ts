import * as core from '@actions/core';
import * as github from '@actions/github';
import type { Release, ReleaseAsset } from '@octokit/webhooks-types';
import type { SemVer } from 'semver';

import { runAndBuffer } from './shell';

const getRepoParams = () =>
  ({
    owner: core.getInput('repository_owner') || github.context.repo.owner,
    repo: core.getInput('repository_name') || github.context.repo.repo,
  }) as const;

const octokit = github.getOctokit(core.getInput('github_token'));

const findRelease = async (filter: (release: any) => boolean) => {
  const releasesPages = octokit.paginate.iterator(
    'GET /repos/{owner}/{repo}/releases',
    {
      ...getRepoParams(),
    }
  );

  for await (const response of releasesPages) {
    for (const release of response.data) {
      if (filter(release)) {
        return release;
      }
    }
  }

  return undefined;
};

const getChangelog = async () =>
  (await runAndBuffer(`yarn conventional-changelog -p angular`))
    .split('\n')
    .slice(1)
    .join('\n')
    .trim();

export const getDevelopmentRelease = async (commitSha: string) => {
  const body = await getChangelog();

  const release = await findRelease(
    (release: Release) => release.name === 'Development'
  );

  if (release) {
    return (
      await octokit.request(
        'PATCH /repos/{owner}/{repo}/releases/{release_id}',
        {
          ...getRepoParams(),
          release_id: release.id,
          draft: true,
          body,
          tag_name: `development-${commitSha}`,
          target_commitish: commitSha,
        }
      )
    ).data;
  }

  return (
    await octokit.request('POST /repos/{owner}/{repo}/releases', {
      ...getRepoParams(),
      draft: true,
      name: 'Development',
      body,
      tag_name: `development-${commitSha}`,
      target_commitish: commitSha,
    })
  ).data;
};

export const getSnapshotRelease = async (commitSha: string) => {
  const body = await getChangelog();

  const release = await findRelease(
    (release: Release) => release.name === 'Snapshot'
  );

  if (release) {
    return (
      await octokit.request(
        'PATCH /repos/{owner}/{repo}/releases/{release_id}',
        {
          ...getRepoParams(),
          release_id: release.id,
          draft: true,
          body,
          tag_name: `snapshot-${commitSha}`,
          target_commitish: commitSha,
        }
      )
    ).data;
  }

  return (
    await octokit.request('POST /repos/{owner}/{repo}/releases', {
      ...getRepoParams(),
      draft: true,
      name: 'Snapshot',
      body,
      tag_name: `snapshot-${commitSha}`,
      target_commitish: commitSha,
    })
  ).data;
};

export const getTaggedRelease = async (version: SemVer, commitSha: string) => {
  const body = await getChangelog();
  const isPrerelease = version.prerelease.length > 0;

  const release = await findRelease(
    (release: Release) => release.tag_name === version.version
  );

  if (release) {
    return (
      await octokit.request(
        'PATCH /repos/{owner}/{repo}/releases/{release_id}',
        {
          ...getRepoParams(),
          release_id: release.id,
          draft: true,
          prerelease: isPrerelease,
          body,
          tag_name: version.version,
          target_commitish: commitSha,
        }
      )
    ).data;
  }

  return (
    await octokit.request('POST /repos/{owner}/{repo}/releases', {
      ...getRepoParams(),
      draft: true,
      prerelease: isPrerelease,
      name: version.version,
      body,
      tag_name: version.version,
      target_commitish: commitSha,
    })
  ).data;
};

export const getReleaseAssets = async (releaseId: number) =>
  octokit.paginate('GET /repos/{owner}/{repo}/releases/{release_id}/assets', {
    ...getRepoParams(),
    release_id: releaseId,
  });

export const clearStaleAssets = async (releaseId: number, expectedAssetNames: string[]) => {
  const assets = await getReleaseAssets(releaseId);
  
  // Delete assets that are not in the expected list (stale assets)
  for (const asset of assets) {
    if (!expectedAssetNames.includes(asset.name)) {
      core.info(`deleting stale asset ${asset.name}`);
      await octokit.request(
        'DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}',
        {
          ...getRepoParams(),
          asset_id: asset.id,
        }
      );
    }
  }
};

export const forceCleanOldAssets = async (releaseId: number, keepLatest: number = 100) => {
  const assets = await getReleaseAssets(releaseId);
  
  if (assets.length <= keepLatest) {
    core.info(`Release has ${assets.length} assets, no cleanup needed`);
    return;
  }
  
  // Sort assets by creation date (newest first) and keep the latest ones
  const sortedAssets = assets.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  const assetsToDelete = sortedAssets.slice(keepLatest);
  
  core.info(`Force cleaning ${assetsToDelete.length} old assets, keeping latest ${keepLatest} assets`);
  
  for (const asset of assetsToDelete) {
    core.info(`deleting old asset ${asset.name} (created: ${asset.created_at})`);
    await octokit.request(
      'DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}',
      {
        ...getRepoParams(),
        asset_id: asset.id,
      }
    );
  }
};

export const overrideAsset = async (
  release: Pick<Release, 'upload_url'>,
  assets: Pick<ReleaseAsset, 'id' | 'name'>[],
  name: string,
  size: number,
  data: Buffer
) => {
  const asset = assets.find((asset) => asset.name === name);

  if (asset) {
    core.info(`deleting existing asset ${name}`);
    await octokit.request(
      'DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}',
      {
        ...getRepoParams(),
        asset_id: asset.id,
      }
    );
  }

  core.info(`uploading asset ${name}`);
  await octokit.request({
    method: 'POST',
    url: release.upload_url,
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': size,
    },
    name,
    label: name,
    data,
  });
};
