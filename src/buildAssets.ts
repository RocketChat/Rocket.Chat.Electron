import fs from 'fs';
import path from 'path';
import util from 'util';

import * as icnsConvert from '@fiahfy/icns-convert';
import * as icoConvert from '@fiahfy/ico-convert';
import Jimp from 'jimp';
import puppeteer from 'puppeteer';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { rimraf } from 'rimraf';

import type { UserPresence } from './servers/common';
import DmgBackground from './ui/assets/DmgBackground';
import NsisSideBar from './ui/assets/NsisSideBar';
import AppIcon from './ui/icons/AppIcon';
import LinuxTrayIcon from './ui/icons/LinuxTrayIcon';
import MacOSAppIcon from './ui/icons/MacOSAppIcon';
import MacOSTrayIcon from './ui/icons/MacOSTrayIcon';
import PresenceMenuIcon from './ui/icons/PresenceMenuIcon';
import WindowsTrayIcon from './ui/icons/WindowsTrayIcon';

const PRESENCES: UserPresence[] = ['online', 'away', 'busy', 'offline'];

const convertSvgToPng = async (
  svg: string,
  ...sizes: (number | [number, number])[]
): Promise<Buffer[]> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--use-gl=desktop'],
  });
  const page = await browser.newPage();
  await page.goto(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  );

  const buffers: Buffer[] = [];

  for await (const size of sizes) {
    await page.setViewport({
      ...(typeof size === 'number'
        ? {
            width: size,
            height: size,
          }
        : {
            width: size[0],
            height: size[1],
          }),
      deviceScaleFactor: 1,
    });
    const buffer = Buffer.from(
      await page.screenshot({
        type: 'png',
        omitBackground: true,
      })
    );
    buffers.push(buffer);
  }

  await page.close();
  await browser.close();

  return buffers;
};

const writeFile = async (filePath: string, data: Buffer): Promise<void> => {
  console.log(util.inspect(filePath, { colors: true }));
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  return fs.promises.writeFile(filePath, data);
};

const createMacOSAppIcon = async (): Promise<void> => {
  const macOSAppIcon = renderToStaticMarkup(createElement(MacOSAppIcon));
  const pngs = await convertSvgToPng(
    macOSAppIcon,
    1024,
    512,
    256,
    128,
    64,
    48,
    32,
    16
  );
  const icns = await icnsConvert.convert(pngs);
  await writeFile('build/icon.icns', icns);
};

const writeMacOSPresenceTrayIcon = async (
  props: {
    presence?: UserPresence;
    disconnected?: boolean;
  },
  fileName: string
): Promise<void> => {
  const icon = renderToStaticMarkup(createElement(MacOSTrayIcon, props));
  const pngs = await convertSvgToPng(icon, 24, 48);
  await writeFile(`src/public/images/tray/darwin/${fileName}.png`, pngs[0]);
  await writeFile(`src/public/images/tray/darwin/${fileName}@2x.png`, pngs[1]);
};

const createMacOSTrayIcons = async (): Promise<void> => {
  const defaultIcon = renderToStaticMarkup(createElement(MacOSTrayIcon));
  const defaultIconPngs = await convertSvgToPng(defaultIcon, 24, 48);
  await writeFile(
    'src/public/images/tray/darwin/defaultTemplate.png',
    defaultIconPngs[0]
  );
  await writeFile(
    'src/public/images/tray/darwin/defaultTemplate@2x.png',
    defaultIconPngs[1]
  );

  for await (const presence of PRESENCES) {
    await writeMacOSPresenceTrayIcon({ presence }, `presence-${presence}`);
  }

  await writeMacOSPresenceTrayIcon({ disconnected: true }, 'disconnected');
};

const createDmgBackgrounds = async (): Promise<void> => {
  const background = renderToStaticMarkup(createElement(DmgBackground));
  const backgroundPngs = await convertSvgToPng(
    background,
    [600, 422],
    [2 * 600, 2 * 422]
  );
  await writeFile('build/background.png', backgroundPngs[0]);
  await writeFile('build/background@2x.png', backgroundPngs[1]);
};

const createWindowsAppIcons = async (): Promise<void> => {
  const windowsAppIcon = renderToStaticMarkup(createElement(AppIcon));
  const pngs = await convertSvgToPng(
    windowsAppIcon,
    16,
    24,
    32,
    48,
    64,
    128,
    256
  );
  const ico = await icoConvert.convert(pngs);
  await writeFile('build/installerIcon.ico', ico);
  await writeFile('build/uninstallerIcon.ico', ico);
  await writeFile('build/icon.ico', ico);
  await writeFile('src/public/images/icon.ico', ico);
};

const writeWindowsTrayIcon = async (
  props: {
    presence?: UserPresence;
    disconnected?: boolean;
  },
  fileName: string
): Promise<void> => {
  const icon = renderToStaticMarkup(createElement(WindowsTrayIcon, props));
  const pngs = await convertSvgToPng(icon, 16, 24, 32, 48, 64, 128, 256);
  const ico = await icoConvert.convert(pngs);
  await writeFile(`src/public/images/tray/win32/${fileName}.ico`, ico);
};

const createWindowsTrayIcons = async (): Promise<void> => {
  await writeWindowsTrayIcon({}, 'default');

  for await (const presence of PRESENCES) {
    await writeWindowsTrayIcon({ presence }, `presence-${presence}`);
  }

  await writeWindowsTrayIcon({ disconnected: true }, 'disconnected');
};

const createNsisSideBars = async (): Promise<void> => {
  const sideBar = renderToStaticMarkup(createElement(NsisSideBar));
  const [sideBarPng] = await convertSvgToPng(sideBar, [164, 314]);
  const sidebarBitmap = await (
    await Jimp.read(sideBarPng)
  ).getBufferAsync(Jimp.MIME_BMP);
  await writeFile('build/installerSidebar.bmp', sidebarBitmap);
  await writeFile('build/uninstallerSidebar.bmp', sidebarBitmap);
};

const createLinuxAppIcons = async (): Promise<void> => {
  const linuxAppIcon = renderToStaticMarkup(createElement(AppIcon));
  const pngs = await convertSvgToPng(
    linuxAppIcon,
    16,
    32,
    48,
    64,
    128,
    256,
    512
  );
  await writeFile('build/icons/16x16.png', pngs[0]);
  await writeFile('build/icons/32x32.png', pngs[1]);
  await writeFile('build/icons/48x48.png', pngs[2]);
  await writeFile('build/icons/64x64.png', pngs[3]);
  await writeFile('build/icons/128x128.png', pngs[4]);
  await writeFile('build/icons/256x256.png', pngs[5]);
  await writeFile('build/icons/512x512.png', pngs[6]);
};

const writeLinuxTrayIcon = async (
  props: {
    presence?: UserPresence;
    disconnected?: boolean;
  },
  fileName: string
): Promise<void> => {
  const icon = renderToStaticMarkup(createElement(LinuxTrayIcon, props));
  const pngs = await convertSvgToPng(icon, 64, 128);
  await writeFile(`src/public/images/tray/linux/${fileName}.png`, pngs[0]);
  await writeFile(`src/public/images/tray/linux/${fileName}@2x.png`, pngs[1]);
};

const createLinuxTrayIcons = async (): Promise<void> => {
  await writeLinuxTrayIcon({}, 'default');

  for await (const presence of PRESENCES) {
    await writeLinuxTrayIcon({ presence }, `presence-${presence}`);
  }

  await writeLinuxTrayIcon({ disconnected: true }, 'disconnected');
};

const writePresenceTrayIcons = async (): Promise<void> => {
  for await (const presence of PRESENCES) {
    await writeMacOSPresenceTrayIcon({ presence }, `presence-${presence}`);
    await writeWindowsTrayIcon({ presence }, `presence-${presence}`);
    await writeLinuxTrayIcon({ presence }, `presence-${presence}`);
  }

  await writeMacOSPresenceTrayIcon({ disconnected: true }, 'disconnected');
  await writeWindowsTrayIcon({ disconnected: true }, 'disconnected');
  await writeLinuxTrayIcon({ disconnected: true }, 'disconnected');
};

// The tray context menu's presence top-level item and submenu radios use a
// dedicated square bullet icon (no rocket) rendered at menu-icon sizes —
// separate from the `presence-<p>.png`/`.ico` tray-bar icons above, which
// are platform-specific and sized for the OS tray/menu bar itself. Sized to
// 12pt, matching Fuselage's `StatusBullet` next to 14px menu text, rather
// than a full 16pt glyph slot, which reads oversized next to menu text;
// generated directly at target size so no runtime resize is needed
// (nativeImage.resize() would drop the @2x representation).
const createPresenceMenuIcons = async (): Promise<void> => {
  for await (const presence of PRESENCES) {
    const icon = renderToStaticMarkup(
      createElement(PresenceMenuIcon, { presence })
    );
    const [png12, png24] = await convertSvgToPng(icon, 12, 24);
    await writeFile(`src/public/images/presence/${presence}.png`, png12);
    await writeFile(`src/public/images/presence/${presence}@2x.png`, png24);
  }
};

const run = async (): Promise<void> => {
  if (process.argv.includes('--presence')) {
    await writePresenceTrayIcons();
    return;
  }

  if (process.argv.includes('--presence-menu-icons')) {
    await createPresenceMenuIcons();
    return;
  }

  await createMacOSAppIcon();
  await createWindowsAppIcons();
  await createLinuxAppIcons();

  await rimraf('src/public/images/tray');

  await createMacOSTrayIcons();
  await createWindowsTrayIcons();
  await createLinuxTrayIcons();

  await createDmgBackgrounds();
  await createNsisSideBars();
};

if (require.main === module) {
  run();
}
