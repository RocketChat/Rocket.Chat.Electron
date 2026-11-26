import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..');
const readJson = (file: string) =>
  JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));

// Same rule as Electron 42+ `lib/browser/desktop-name.ts`: without a
// `desktopName` in package.json, Electron slugs the app name. The result
// (minus `.desktop`) becomes both the X11 WM_CLASS and the Wayland app_id.
const electronDefaultDesktopName = (name: string) =>
  `${name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}.desktop`;

describe('Linux desktop entry', () => {
  it('sets StartupWMClass to the WM class that Electron gives the windows', () => {
    const packageJson = readJson('package.json');
    const electronBuilder = readJson('electron-builder.json');

    const desktopName: string =
      packageJson.desktopName ??
      electronDefaultDesktopName(packageJson.productName ?? packageJson.name);
    const wmClass = desktopName.replace(/\.desktop$/, '');

    // Without an explicit value, electron-builder writes productName
    // ("Rocket.Chat"), which no longer matches and hides the dock icon.
    expect(electronBuilder.linux.desktop.entry.StartupWMClass).toBe(wmClass);
  });

  it('gives Electron the desktop file name that the deb and rpm packages install', () => {
    const packageJson = readJson('package.json');
    const electronBuilder = readJson('electron-builder.json');

    // electron-builder installs the deb and rpm entry as
    // `<linux.executableName>.desktop`. On Wayland the window app_id is the
    // Electron desktop name, and it must match that file name.
    const installedDesktopFile = `${electronBuilder.linux.executableName}.desktop`;

    expect(packageJson.desktopName).toBe(installedDesktopFile);
  });
});
