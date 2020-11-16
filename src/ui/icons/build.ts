import fs from 'fs';

import * as icnsConvert from '@fiahfy/icns-convert';
import puppeteer from 'puppeteer';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import MacOSAppIcon from './MacOSAppIcon';

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

const writeBuildFile = (name: string, data: Buffer): Promise<void> => {
  console.log({ name });
  return fs.promises.writeFile(`build/${ name }`, data);
};

const createMacOSAppIcon = async (): Promise<void> => {
  const svg = renderToStaticMarkup(createElement(MacOSAppIcon));

  const png16 = await convertSvgToPng(svg, { width: 16, height: 16 });
  const png32 = await convertSvgToPng(svg, { width: 32, height: 32 });
  const png64 = await convertSvgToPng(svg, { width: 64, height: 64 });
  const png128 = await convertSvgToPng(svg, { width: 128, height: 128 });
  const png256 = await convertSvgToPng(svg, { width: 256, height: 256 });
  const png512 = await convertSvgToPng(svg, { width: 512, height: 512 });
  const png1024 = await convertSvgToPng(svg, { width: 1024, height: 1024 });

  const icns = await icnsConvert.convert([png1024, png512, png256, png128, png64, png32, png16]);

  await writeBuildFile('icon.icns', icns);
};

const run = async (): Promise<void> => {
  await createMacOSAppIcon();
};

if (require.main === module) {
  run();
}
