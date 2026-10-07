import * as core from '@actions/core';

import { run, runElectronBuilder } from './shell';

export const setupSnapcraft = (): Promise<void> =>
  core.group('Setup Snapcraft', async () => {
    await run(`sudo snap install snapcraft --classic --channel stable`);
  });

export const packOnLinux = (
  targets = 'tar.gz deb rpm snap AppImage'
): Promise<void> => runElectronBuilder(`--linux ${targets}`);

const snapChannels = ['edge', 'beta', 'candidate', 'stable'] as const;

export const uploadSnap = async (
  snapFilePath: string,
  level: (typeof snapChannels)[number]
): Promise<void> => {
  const channels = snapChannels.slice(0, snapChannels.indexOf(level) + 1);

  for (const channel of channels) {
    await core.group(
      `uploading ${snapFilePath} to Snapcraft in channel ${channel}`,
      () => run(`snapcraft upload --release=${channel} "${snapFilePath}"`)
    );
  }
};
