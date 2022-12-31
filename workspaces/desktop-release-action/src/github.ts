/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as core from '@actions/core';
import * as github from '@actions/github';
import type { Release, ReleaseAsset } from '@octokit/webhooks-types';
import type { SemVer } from 'semver';

import { runAndBuffer } from './shell';

const getRepoParams = () =>
  ({
    owner: core.getInput('repository_owner') || github.context.repo.owner,
    repo: core.getInput('repository_name') || github.context.repo.repo,
  } as const);

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
  (await runAndBuffer(`yarn --silent conventional-changelog -p angular`))
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
