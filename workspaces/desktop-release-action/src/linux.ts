import * as core from '@actions/core';

import { run, runElectronBuilder } from './shell';

export const setupSnapcraft = (): Promise<void> =>
  core.group('Setup Snapcraft', async () => {
    await run(`sudo snap install snapcraft --classic --channel stable`);
    // await run(`sudo apt install gnome-keyring`);
    // await run(`dbus-run-session -- bash --noprofile --norc`);
    // await run(`rm -rf ~/.local/share/keyrings`);
    // await run(`echo -n 'db' | gnome-keyring-daemon --unlock`);
    // await run(`echo /snap/bin >> ${process.env.GITHUB_PATH}`);
    // await run('sudo chown root:root /');
  });

export const packOnLinux = (): Promise<void> =>
  runElectronBuilder(`--linux tar.gz deb rpm snap AppImage`);

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
