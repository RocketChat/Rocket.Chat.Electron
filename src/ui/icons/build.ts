import fs from 'fs';
import util from 'util';

import * as icnsConvert from '@fiahfy/icns-convert';
import * as icoConvert from '@fiahfy/ico-convert';
import puppeteer from 'puppeteer';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AppIcon from './AppIcon';
import MacOSAppIcon from './MacOSAppIcon';
import MacOSTrayIcon from './MacOSTrayIcon';

const convertSvgToPng = async (svg: string, { width, height }: { width: number; height: number }): Promise<Buffer> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`data:image/svg+xml;base64,${ Buffer.from(svg).toString('base64') }`);
  const buffer = await page.screenshot({ type: 'png', omitBackground: true });
  await page.close();
  await browser.close();
  return buffer;
};

const convertSvgToManyPng = async (svg: string, ...sizes: number[]): Promise<Buffer[]> => {
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
  const pngs = await convertSvgToManyPng(macOSAppIcon, 1024, 512, 256, 64, 32, 16);
  const icns = await icnsConvert.convert(pngs);
  await writeBuildFile('icon.icns', icns);
};

const createMacOSTrayIcons = async (): Promise<void> => {
  const defaultIcon = renderToStaticMarkup(createElement(MacOSTrayIcon));
  const notificationIcon = renderToStaticMarkup(createElement(MacOSTrayIcon, { notification: true }));

  const create = async (icon: string, name: string): Promise<void> => {
    const png24 = await convertSvgToPng(icon, { width: 24, height: 24 });
    const png48 = await convertSvgToPng(icon, { width: 48, height: 48 });

    await writeTrayIcon(`darwin/${ name }Template.png`, png24);
    await writeTrayIcon(`darwin/${ name }Template@2x.png`, png48);
  };

  await create(defaultIcon, 'default');
  await create(notificationIcon, 'notification');
};

const createWindowsAppIcons = async (): Promise<void> => {
  const windowsAppIcon = renderToStaticMarkup(createElement(AppIcon));

  const png16 = await convertSvgToPng(windowsAppIcon, { width: 16, height: 16 });
  const png24 = await convertSvgToPng(windowsAppIcon, { width: 24, height: 24 });
  const png32 = await convertSvgToPng(windowsAppIcon, { width: 32, height: 32 });
  const png48 = await convertSvgToPng(windowsAppIcon, { width: 48, height: 48 });
  const png64 = await convertSvgToPng(windowsAppIcon, { width: 64, height: 64 });
  const png128 = await convertSvgToPng(windowsAppIcon, { width: 128, height: 128 });
  const png256 = await convertSvgToPng(windowsAppIcon, { width: 256, height: 256 });

  const ico = await icoConvert.convert([png16, png24, png32, png48, png64, png128, png256]);

  await writeBuildFile('installerIcon.ico', ico);
  await writeBuildFile('uninstallerIcon.ico', ico);
  await writeBuildFile('icon.ico', ico);
};

const createLinuxAppIcons = async (): Promise<void> => {
  const linuxAppIcon = renderToStaticMarkup(createElement(AppIcon));

  const png16 = await convertSvgToPng(linuxAppIcon, { width: 16, height: 16 });
  const png32 = await convertSvgToPng(linuxAppIcon, { width: 32, height: 32 });
  const png48 = await convertSvgToPng(linuxAppIcon, { width: 48, height: 48 });
  const png64 = await convertSvgToPng(linuxAppIcon, { width: 64, height: 64 });
  const png128 = await convertSvgToPng(linuxAppIcon, { width: 128, height: 128 });
  const png256 = await convertSvgToPng(linuxAppIcon, { width: 256, height: 256 });
  const png512 = await convertSvgToPng(linuxAppIcon, { width: 512, height: 512 });

  await writeBuildFile('icons/16x16.png', png16);
  await writeBuildFile('icons/32x32.png', png32);
  await writeBuildFile('icons/48x48.png', png48);
  await writeBuildFile('icons/64x64.png', png64);
  await writeBuildFile('icons/128x128.png', png128);
  await writeBuildFile('icons/256x256.png', png256);
  await writeBuildFile('icons/512x512.png', png512);
};

const run = async (): Promise<void> => {
  await createMacOSAppIcon();
  await createMacOSTrayIcons();

  await createWindowsAppIcons();
  await createLinuxAppIcons();
};

if (require.main === module) {
  run();
}
