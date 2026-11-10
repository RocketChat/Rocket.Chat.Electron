import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { app, BrowserWindow, webContents, screen } from 'electron';
import type { WebContents } from 'electron';

// Run with yarn benchmark:hidden-window --start-hidden.
// --app selects a separately built checkout for a before/after comparison.
const argument = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  assert(value && !value.startsWith('--'), `Missing value for ${name}`);
  return value;
};
const root = path.resolve(argument('--app', '.'));
const output = path.resolve(
  argument('--output', path.join(os.tmpdir(), 'hidden-window.json'))
);
const expected = argument('--expect', 'after');
assert(['before', 'after'].includes(expected));
assert(process.argv.includes('--start-hidden'), 'Pass --start-hidden');
const energy = process.argv.includes('--energy');
const sampleCount = Number(argument('--samples', '60'));
assert(
  Number.isInteger(sampleCount) && sampleCount >= 10 && sampleCount <= 600,
  '--samples must be an integer between 10 and 600'
);
assert(!energy || sampleCount === 60, '--energy requires 60 samples');
const animated = !process.argv.includes('--static');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rocket-hidden-window-'));
// The harness is the Electron entry point. Resolve product assets from the
// selected build while keeping the benchmark profile separate.
app.getAppPath = () => root;
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
) as { version: string; productName: string };
app.setName(packageJson.productName);
app.getVersion = () => packageJson.version;
app.setPath('appData', profile);
app.setPath('userData', profile);
app.setPath('logs', path.join(profile, 'logs'));
const clients = new Set<http.ServerResponse>();
let channelLoads = 0;
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
    });
    response.write(': connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }
  if (url.pathname === '/image') {
    response.setHeader('Content-Type', animated ? 'image/gif' : 'image/png');
    response.end(
      fs.readFileSync(
        path.resolve(
          'scripts/fixtures/hidden-window',
          animated ? 'animated.gif' : 'static.png'
        )
      )
    );
    return;
  }
  if (url.pathname === '/api/info') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ version: '8.9.0', success: true }));
    return;
  }
  if (url.pathname !== '/') {
    response.writeHead(404).end();
    return;
  }
  channelLoads += 1;
  response.setHeader('Content-Type', 'text/html');
  response.end(`<!doctype html><title>Hidden window benchmark</title><style>
    body { margin: 8px; background: #222; color: white; }
    section { display:grid; grid-template-columns:repeat(12,48px); gap:4px; margin-bottom:12px; }
    section:last-of-type { grid-template-columns:repeat(3,192px); }
    img { width:48px; height:48px; } section:last-of-type img { width:192px; height:192px; }
    </style><h1>Test channel</h1><section>${Array.from({ length: 54 }, (_, i) => `${i === 48 ? '</section><section>' : ''}<img src='/image?id=${i}'>`).join('')}</section><div style='height:1600px'>Scroll position control</div><ol id='messages'></ol><input id='compose' aria-label='Focus control' style='position:fixed;right:8px;bottom:8px;width:120px'><script>
    window.fixture = {frames:0, messages:[], notifications:[], booted:false};
    ${animated ? 'function frame(){fixture.frames++;requestAnimationFrame(frame)}requestAnimationFrame(frame);' : ''}
    const events = new EventSource('/events');
    events.onmessage = async ({data}) => {
      fixture.messages.push(data);
      const item = document.createElement('li');item.textContent=data;document.querySelector('#messages').append(item);
      if (data === 'notification') {
        await window.RocketChatDesktop.createNotification({title:'Hidden-window QA', body:'Disposable benchmark notification', onEvent:e=>fixture.notifications.push(e.type)});
      }
    };
    const boot = setInterval(()=>{
      if (!window.RocketChatDesktop) return;
      clearInterval(boot);
      window.RocketChatDesktop.setServerInfo({version:'8.9.0'});
      window.dispatchEvent(new CustomEvent('startup',{detail:true}));
      fixture.booted=true;
    },100);
    </script>`);
});

const waitFor = async <T>(
  read: () => T | undefined,
  label: string
): Promise<T> => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const result = read();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
};
const snapshot = (
  contents: WebContents
): Promise<{
  frames: number;
  images: number;
  scroll: number;
  messages: string[];
  notifications: string[];
  booted: boolean;
  visibility: string;
  activeElement: string;
  focused: boolean;
}> =>
  contents.executeJavaScript(
    `({ ...window.fixture, images:[...document.images].filter(i=>i.complete&&i.naturalWidth===96).length, scroll:scrollY, visibility:document.visibilityState, activeElement:document.activeElement?.id, focused:document.hasFocus() })`
  );
const main = async (): Promise<void> => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}/`;
  const settingsDirectory = path.join(profile, `${app.name} (development)`);
  fs.mkdirSync(settingsDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(settingsDirectory, 'config.json'),
    JSON.stringify({
      servers: [
        {
          url: origin,
          title: 'Benchmark',
          userLoggedIn: true,
          version: '8.9.0',
        },
      ],
      currentView: { url: origin },
      isTrayIconEnabled: true,
      doCheckForUpdatesOnStartup: false,
      isReportEnabled: false,
      isShowWindowOnUnreadChangedEnabled: false,
      rootWindowState: {
        focused: false,
        visible: false,
        minimized: false,
        maximized: false,
        fullscreen: false,
        normal: true,
        bounds: { x: 100, y: 100, width: 1000, height: 700 },
      },
    })
  );
  fs.copyFileSync(
    path.join(settingsDirectory, 'config.json'),
    path.join(profile, 'config.json')
  );
  createRequire(path.join(root, 'package.json'))(
    path.join(root, 'app/main.js')
  );
  await app.whenReady();
  const window = await waitFor(
    () =>
      BrowserWindow.getAllWindows().find(
        (w) =>
          w.webContents.getURL().endsWith('/app/index.html') &&
          w.getMinimumSize()[0] === 400
      ),
    'root window'
  );
  const guest = await waitFor(
    () =>
      webContents
        .getAllWebContents()
        .find((w) => w.getType() === 'webview' && w.getURL() === origin),
    'workspace'
  );
  for (let i = 0; i < 100 && !(await snapshot(guest)).booted; i++)
    await delay(100);
  assert(
    (await snapshot(guest)).booted,
    'Fixture must initialize while hidden'
  );
  const phases = [];
  const states = process.argv.includes('--initial-only')
    ? ['initially-hidden']
    : ['initially-hidden', 'visible', 'hidden', 'minimized', 'restored'];
  for (const state of states) {
    if (state === 'visible' || state === 'restored') {
      window.setAlwaysOnTop(true);
      window.restore();
      window.show();
      window.focus();
    } else if (state === 'hidden') window.hide();
    else if (state === 'minimized') {
      window.show();
      window.minimize();
    }
    await delay(energy ? 45_000 : 3000);
    const before = await snapshot(guest);
    assert.equal(before.images, 54);
    assert.equal(
      window.isVisible(),
      state === 'visible' || state === 'restored'
    );
    const rootVisibility = await window.webContents.executeJavaScript(
      'document.visibilityState'
    );
    const startedAt = new Date().toISOString();
    process.stdout.write(
      JSON.stringify({
        state,
        startedAt,
        expected,
        animated,
        rootVisibility,
        guestVisibility: before.visibility,
      }) + '\n'
    );
    app.getAppMetrics();
    const samples = [];
    for (let i = 0; i < sampleCount; i++) {
      await delay(energy ? 1000 : 250);
      const metrics = app.getAppMetrics();
      samples.push({
        time: new Date().toISOString(),
        browserCpu: metrics
          .filter((m) => m.type === 'Browser')
          .reduce((s, m) => s + m.cpu.percentCPUUsage, 0),
        rendererCpu: metrics
          .filter((m) => m.type === 'Tab')
          .reduce((s, m) => s + m.cpu.percentCPUUsage, 0),
        gpuProcessCpu: metrics
          .filter((m) => m.type === 'GPU')
          .reduce((s, m) => s + m.cpu.percentCPUUsage, 0),
      });
    }
    const endedAt = new Date().toISOString();
    const after = await snapshot(guest);
    const frames = after.frames - before.frames;
    if (animated) {
      const playing =
        state === 'visible' ||
        state === 'restored' ||
        (state === 'initially-hidden' && expected === 'before');
      assert(
        playing ? frames > 1 : frames === 0,
        `${state}: unexpected animation frames ${frames}`
      );
    }
    let capturedFrames: number | undefined;
    if (state === 'visible') {
      const bounds = await guest.executeJavaScript(`(() => {
        const {x,y,width,height} = document.images[0].getBoundingClientRect();
        return {x:Math.floor(x),y:Math.floor(y),width:Math.floor(width),height:Math.floor(height)};
      })()`);
      const hashes = new Set<string>();
      for (let i = 0; i < 4; i++) {
        await delay(130);
        const bitmap = (await guest.capturePage(bounds)).toBitmap();
        assert(bitmap.length >= 4, 'Empty fixture capture');
        let varied = false;
        for (let offset = 4; offset < bitmap.length; offset += 4) {
          if (
            bitmap[offset] !== bitmap[0] ||
            bitmap[offset + 1] !== bitmap[1] ||
            bitmap[offset + 2] !== bitmap[2]
          ) {
            varied = true;
            break;
          }
        }
        assert(varied, 'Blank fixture capture');
        hashes.add(createHash('sha256').update(bitmap).digest('hex'));
      }
      capturedFrames = hashes.size;
      assert(
        animated ? capturedFrames > 1 : capturedFrames === 1,
        'Unexpected image playback after showing the window'
      );
    }
    const message = `message-${state}`;
    for (const client of clients) client.write(`data: ${message}\n\n`);
    await delay(500);
    const received = await snapshot(guest);
    assert.equal(
      received.messages.filter((m) => m === message).length,
      1,
      'Hidden workspace must receive each event once'
    );
    if (state === 'visible')
      await guest.executeJavaScript(
        "document.querySelector('#compose').focus(); scrollTo(0,500)"
      );
    if (state === 'restored') {
      assert.equal(
        after.activeElement,
        'compose',
        'Restore must preserve the focused input'
      );
      assert(
        after.focused,
        'Restore must return keyboard focus to the workspace'
      );
      assert.equal(after.scroll, 500, 'Restore must preserve scroll position');
    }
    phases.push({
      state,
      startedAt,
      endedAt,
      rootVisibility,
      before,
      after,
      capturedFrames,
      samples,
    });
  }
  const report = {
    context: {
      expected,
      animated,
      energy,
      sampleCount,
      sampleIntervalMs: energy ? 1000 : 250,
      warmupMs: energy ? 45000 : 3000,
      appVersion: app.getVersion(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      versions: process.versions,
      platform: process.platform,
      os: os.release(),
      cpu: os.cpus()[0].model,
      logicalCpus: os.cpus().length,
      displays: screen.getAllDisplays().map((d) => ({
        size: d.size,
        scaleFactor: d.scaleFactor,
        frequency: d.displayFrequency,
      })),
      gpu: app.getGPUFeatureStatus(),
      profileIsolated: true,
      channelLoads,
    },
    phases,
  };
  assert.equal(
    channelLoads,
    1,
    'Hide and restore must not reload the workspace'
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`Wrote ${output}\n`);
  for (const client of clients) client.end();
  server.closeAllConnections();
  server.close();
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  app.exit(0);
  process.exit(0);
};
main().catch((error) => {
  process.stderr.write(
    `Benchmark failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  console.error(error);
  server.closeAllConnections();
  server.close();
  for (const window of BrowserWindow.getAllWindows()) window.destroy();
  app.exit(1);
  process.exit(1);
});
