import { promises } from 'fs';

import * as core from '@actions/core';

import { run, runElectronBuilder } from './shell';

export const setupSnapcraft = (): Promise<void> =>
  core.group('Setup Snapcraft', async () => {
    await run(`sudo snap install snapcraft --classic --channel stable`);
    await run(`echo /snap/bin >> ${process.env.GITHUB_PATH}`);
    await run('sudo chown root:root /');

    const snapcraftToken = core.getInput('snapcraft_token');
    const snapcraftTokenFile = './snapcraft-token.txt';
    await promises.writeFile(snapcraftTokenFile, snapcraftToken, 'utf-8');
    await run(`/snap/bin/snapcraft login --with ${snapcraftTokenFile}`);
    await promises.unlink(snapcraftTokenFile);
  });

export const packOnLinux = (): Promise<void> =>
  runElectronBuilder(`--linux tar.gz deb rpm snap`);

const snapChannels = ['edge', 'beta', 'candidate', 'stable'] as const;

export const uploadSnap = async (
  snapFilePath: string,
  level: typeof snapChannels[number]
): Promise<void> => {
  const channels = snapChannels.slice(0, snapChannels.indexOf(level) + 1);

  for (const channel of channels) {
    await core.group(
      `uploading ${snapFilePath} to Snapcraft in channel ${channel}`,
      () => run(`snapcraft upload --release=${channel} "${snapFilePath}"`)
    );
  }
};
