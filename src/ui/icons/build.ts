import fs from 'fs';
import util from 'util';

import * as icnsConvert from '@fiahfy/icns-convert';
import * as icoConvert from '@fiahfy/ico-convert';
import puppeteer from 'puppeteer';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Server } from '../../servers/common';
import AppIcon from './AppIcon';
import MacOSAppIcon from './MacOSAppIcon';
import MacOSTrayIcon from './MacOSTrayIcon';
import WindowsTrayIcon from './WindowsTrayIcon';

const convertSvgToPng = async (svg: string, ...sizes: number[]): Promise<Buffer[]> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`data:image/svg+xml;base64,${ Buffer.from(svg).toString('base64') }`);

  const buffers: Buffer[] = [];

  for await (const size of sizes) {
    await page.setViewport({
      width: size,
      height: size,
      deviceScaleFactor: 1,
    });
    const buffer = await page.screenshot({ type: 'png', omitBackground: true });
    buffers.push(buffer);
  }

  await page.close();
  await browser.close();

  return buffers;
};

const writeBuildFile = (name: string, data: Buffer): Promise<void> => {
  console.log('build/', util.inspect(name, { colors: true }));
  return fs.promises.writeFile(`build/${ name }`, data);
};

const writeTrayIcon = (name: string, data: Buffer): Promise<void> => {
  console.log('src/public/images/tray/', util.inspect(name, { colors: true }));
  return fs.promises.writeFile(`src/public/images/tray/${ name }`, data);
};

const createMacOSAppIcon = async (): Promise<void> => {
  const macOSAppIcon = renderToStaticMarkup(createElement(MacOSAppIcon));
  const pngs = await convertSvgToPng(macOSAppIcon, 1024, 512, 256, 64, 32, 16);
  const icns = await icnsConvert.convert(pngs);
  await writeBuildFile('icon.icns', icns);
};

const createMacOSTrayIcons = async (): Promise<void> => {
  const defaultIcon = renderToStaticMarkup(createElement(MacOSTrayIcon));
  const defaultIconPngs = await convertSvgToPng(defaultIcon, 24, 48);
  await writeTrayIcon('darwin/defaultTemplate.png', defaultIconPngs[0]);
  await writeTrayIcon('darwin/defaultTemplate@2x.png', defaultIconPngs[1]);

  const notificationIcon = renderToStaticMarkup(createElement(MacOSTrayIcon, { notification: true }));
  const notificationIconPngs = await convertSvgToPng(notificationIcon, 24, 48);
  await writeTrayIcon('darwin/notificationTemplate.png', notificationIconPngs[0]);
  await writeTrayIcon('darwin/notificationTemplate@2x.png', notificationIconPngs[1]);
};

const createWindowsAppIcons = async (): Promise<void> => {
  const windowsAppIcon = renderToStaticMarkup(createElement(AppIcon));
  const pngs = await convertSvgToPng(windowsAppIcon, 16, 24, 32, 48, 64, 128, 256);
  const ico = await icoConvert.convert(pngs);
  await writeBuildFile('installerIcon.ico', ico);
  await writeBuildFile('uninstallerIcon.ico', ico);
  await writeBuildFile('icon.ico', ico);
};

const createWindowsTrayIcons = async (): Promise<void> => {
  const defaultIcon = renderToStaticMarkup(createElement(WindowsTrayIcon));
  const defaultIconPngs = await convertSvgToPng(defaultIcon, 16, 24, 32, 48, 64, 128, 256);
  const defaultIconIco = await icoConvert.convert(defaultIconPngs);
  writeTrayIcon('win32/default.ico', defaultIconIco);

  for await (const badge of ['•', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Server['badge'][]) {
    const notificationIcon = renderToStaticMarkup(createElement(WindowsTrayIcon, { badge }));
    const notificationIconPngs = await convertSvgToPng(notificationIcon, 16, 24, 32, 48, 64, 128, 256);
    const notificationIconIco = await icoConvert.convert(notificationIconPngs);
    const name = (badge === '•' && 'dot') || (badge > 9 && 'plus-9') || String(badge);
    writeTrayIcon(`win32/notification-${ name }.ico`, notificationIconIco);
  }
};

const createLinuxAppIcons = async (): Promise<void> => {
  const linuxAppIcon = renderToStaticMarkup(createElement(AppIcon));
  const pngs = await convertSvgToPng(linuxAppIcon, 16, 32, 48, 64, 128, 256, 512);
  await writeBuildFile('icons/16x16.png', pngs[0]);
  await writeBuildFile('icons/32x32.png', pngs[1]);
  await writeBuildFile('icons/48x48.png', pngs[2]);
  await writeBuildFile('icons/64x64.png', pngs[3]);
  await writeBuildFile('icons/128x128.png', pngs[4]);
  await writeBuildFile('icons/256x256.png', pngs[5]);
  await writeBuildFile('icons/512x512.png', pngs[6]);
};

const run = async (): Promise<void> => {
  await createMacOSAppIcon();
  await createMacOSTrayIcons();

  await createWindowsAppIcons();
  await createWindowsTrayIcons();

  await createLinuxAppIcons();
};

if (require.main === module) {
  run();
}
