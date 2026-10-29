import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { app, BrowserWindow } from 'electron';

// Run from the repository root:
// yarn electron scripts/benchmark-image-animation.ts --output /tmp/image-animation.json
const fixtureDirectory = path.resolve('scripts/fixtures/image-animation');
const fixtureTypes: Record<string, string> = {
  'animated.gif': 'image/gif',
  'animated.png': 'image/png',
  'animated.webp': 'image/webp',
  'static.png': 'image/png',
};
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const file =
    url.pathname === '/avatar/user'
      ? 'animated.gif'
      : path.basename(url.pathname);
  if (file in fixtureTypes) {
    response.writeHead(200, {
      'Content-Type': fixtureTypes[file],
      'Cache-Control': 'no-store',
    });
    response.end(fs.readFileSync(path.join(fixtureDirectory, file)));
    return;
  }
  const count = url.searchParams.has('single') ? 1 : 54;
  const types = url.searchParams.has('static')
    ? ['static.png']
    : ['animated.gif', 'animated.png', 'animated.webp'];
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(`<!doctype html><style>
    body { margin: 8px; background: #222; }
    section { display: grid; grid-template-columns: repeat(12, 48px); gap: 4px; margin-bottom: 12px; }
    section:last-child { grid-template-columns: repeat(3, 192px); }
    img { display: block; width: 48px; height: 48px; }
    section:last-child img { width: 192px; height: 192px; }
    </style><section>${Array.from(
      { length: count },
      (_, i) =>
        `${i === 48 ? '</section><section>' : ''}<img src="/${types[i % types.length]}?image=${i}">`
    ).join('')}</section>`);
});

type Sample = {
  rendererCpu: number;
  gpuProcessCpu: number;
  rendererWorkingSetKB: number;
};

const average = (values: number[]): number =>
  Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)
  );

const main = async (): Promise<void> => {
  await app.whenReady();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const checks: Record<string, unknown> = {};
  const window = new BrowserWindow({
    width: 680,
    height: 720,
    useContentSize: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  window.setAlwaysOnTop(true);
  window.show();
  window.focus();
  const contents = window.webContents;

  const frameCount = async (): Promise<number> => {
    const bounds = await contents.executeJavaScript(`(() => {
      const image = document.querySelector('img');
      if (!image?.complete || image.naturalWidth !== 96 || image.naturalHeight !== 96) {
        throw new Error('Fixture image did not decode');
      }
      const { x, y, width, height } = image.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        throw new Error('Fixture image has no visible bounds');
      }
      return { x: Math.floor(x), y: Math.floor(y), width: Math.floor(width), height: Math.floor(height) };
    })()`);
    const frames = new Set<string>();
    for (let i = 0; i < 8; i++) {
      await delay(130);
      const bitmap = (await contents.capturePage(bounds)).toBitmap();
      assert(bitmap.length >= 4, 'Image capture is empty');
      let hasImagePixels = false;
      for (let offset = 4; offset < bitmap.length; offset += 4) {
        if (
          bitmap[offset] !== bitmap[0] ||
          bitmap[offset + 1] !== bitmap[1] ||
          bitmap[offset + 2] !== bitmap[2]
        ) {
          hasImagePixels = true;
          break;
        }
      }
      // Every fixture frame has a color grid. A uniform image rectangle means
      // the capture contains only a blank background, even if decoding succeeded.
      assert(hasImagePixels, 'Fixture image capture is blank');
      frames.add(createHash('sha256').update(bitmap).digest('hex'));
    }
    return frames.size;
  };

  for (const [name, policy] of [
    ['playing', 'animate'],
    ['stopped', 'noAnimation'],
  ] as const) {
    contents.setImageAnimationPolicy(policy);
    await contents.loadURL(`${origin}/?single`);
    await delay(300);
    const frames = await frameCount();
    checks[name] = frames;
    assert(
      name === 'playing' ? frames > 1 : frames === 1,
      `${name}: ${frames} frames`
    );
  }
  // Check all supported formats independently and an extensionless avatar URL.
  for (const type of [...Object.keys(fixtureTypes), 'avatar/user']) {
    for (const policy of ['animate', 'noAnimation'] as const) {
      contents.setImageAnimationPolicy(policy);
      await contents.loadURL(`${origin}/${type}`);
      await delay(300);
      const frames = await frameCount();
      checks[`${type}:${policy}`] = frames;
      assert(
        policy === 'noAnimation' || type === 'static.png'
          ? frames === 1
          : frames > 1
      );
    }
  }
  contents.setImageAnimationPolicy('animate');
  await contents.loadURL(`${origin}/?single`);
  await delay(300);
  contents.setImageAnimationPolicy('noAnimation');
  checks.existingImageAfterLiveChange = await frameCount();
  await contents.reload();
  await delay(500);
  checks.existingImageAfterReload = await frameCount();
  assert.equal(checks.existingImageAfterReload, 1);
  contents.setImageAnimationPolicy('animate');
  await contents.reload();
  await delay(500);
  checks.reenabledAfterReload = await frameCount();
  assert(Number(checks.reenabledAfterReload) > 1);
  checks.prefersReducedMotion = await contents.executeJavaScript(
    "matchMedia('(prefers-reduced-motion: reduce)').matches"
  );
  console.log(JSON.stringify({ checks }));

  const rounds: Array<{
    round: number;
    condition: string;
    samples: Sample[];
    mean: Sample;
  }> = [];
  for (
    let round = 0;
    round < (process.argv.includes('--verify-only') ? 0 : 3);
    round++
  ) {
    const order =
      round % 2 === 0
        ? ['before', 'after', 'static']
        : ['static', 'after', 'before'];
    for (const condition of order) {
      window.show();
      window.focus();
      contents.setImageAnimationPolicy(
        condition === 'after' ? 'noAnimation' : 'animate'
      );
      await contents.loadURL(
        `${origin}/${condition === 'static' ? '?static' : ''}`
      );
      await delay(3000);
      const frames = await frameCount();
      console.log(
        JSON.stringify({
          round: round + 1,
          condition,
          frames,
          visible: window.isVisible(),
          focused: window.isFocused(),
        })
      );
      assert(
        condition === 'before' ? frames > 1 : frames === 1,
        `Unexpected animation in ${condition}: ${frames}`
      );
      assert.equal(
        await contents.executeJavaScript(
          'Array.from(document.images).filter(i => i.complete && i.naturalWidth === 96).length'
        ),
        54
      );
      const rendererPid = contents.getOSProcessId();
      app.getAppMetrics();
      const samples: Sample[] = [];
      for (let i = 0; i < 60; i++) {
        await delay(250);
        const metrics = app.getAppMetrics();
        const renderer = metrics.find(({ pid }) => pid === rendererPid);
        assert(renderer, 'renderer metric missing');
        samples.push({
          rendererCpu: renderer.cpu.percentCPUUsage,
          gpuProcessCpu: metrics
            .filter(({ type }) => type === 'GPU')
            .reduce((sum, metric) => sum + metric.cpu.percentCPUUsage, 0),
          rendererWorkingSetKB: renderer.memory.workingSetSize,
        });
      }
      const framesAfterSampling = await frameCount();
      assert(
        condition === 'before'
          ? framesAfterSampling > 1
          : framesAfterSampling === 1,
        `Window stopped painting during ${condition}`
      );
      const mean: Sample = {
        rendererCpu: average(samples.map((sample) => sample.rendererCpu)),
        gpuProcessCpu: average(samples.map((sample) => sample.gpuProcessCpu)),
        rendererWorkingSetKB: average(
          samples.map((sample) => sample.rendererWorkingSetKB)
        ),
      };
      rounds.push({ round: round + 1, condition, samples, mean });
      console.log(JSON.stringify({ round: round + 1, condition, mean }));
    }
  }
  const result = {
    environment: {
      electron: process.versions.electron,
      chromium: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
      os: os.release(),
      cpu: os.cpus()[0].model,
      logicalCpus: os.cpus().length,
      gpu: await app.getGPUInfo('basic'),
      featureStatus: app.getGPUFeatureStatus(),
    },
    workload: {
      avatars: 48,
      avatarSize: 48,
      inlineImages: 6,
      inlineSize: 192,
      types: ['GIF', 'APNG', 'WebP'],
      uniqueUrls: 54,
      framesPerImage: 12,
      frameDelayMs: 80,
      warmupMs: 3000,
      samplesPerRound: 60,
      sampleIntervalMs: 250,
      rounds: 3,
    },
    checks,
    rounds,
  };
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex >= 0) {
    fs.writeFileSync(
      process.argv[outputIndex + 1],
      `${JSON.stringify(result, null, 2)}\n`
    );
  }
  window.destroy();
  server.close();
  app.quit();
};

main().catch((error: unknown) => {
  console.error(error);
  server.close();
  app.exit(1);
});
