// Live check of the cap on the pending-decrypt set of the crawler.
// Run seed-rooms.mjs with --lost-count 6000 first: the room
// "lost" then has more messages than the cap that no client can decrypt.
//
//   node pending-cap.mjs [--port <port>] [--max-minutes 60] [--out file.jsonl]
//
// A new login of user A in headless Chrome (a new profile, the E2E password
// typed in the dialog) turns on the memory-only index of a development
// server (local storage E2EESearch_FakeBackend) and the opt-in. Then the
// real crawler of the web client indexes every encrypted room at its normal
// pace. Every 30 s the script writes one JSON line: the crawler progress
// (rooms, roomsDone, indexed, pendingDecrypt), the size of each Map in the
// page heap that holds 1000 or more entries (Runtime.queryObjects, an
// independent count of the pending map), and the JS heap after a forced GC.
// It stops when every room is done, or after --max-minutes.
// It prints counts only.

import { appendFileSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { installE2eModule } from './e2e-module.mjs';
import { readState, stateDir, usersOf, worldKey } from './state.mjs';

const require = createRequire(import.meta.url);
const { values } = parseArgs({
  options: {
    'port': { type: 'string' },
    'max-minutes': { type: 'string', default: '60' },
    'out': { type: 'string' },
  },
});
const port = Number(values.port ?? process.env.HARNESS_PORT ?? 3500);
const base = `http://${process.env.HARNESS_HOST ?? 'localhost'}:${port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) =>
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
const fail = (m) => {
  console.error(`pending-cap: ${m}`);
  process.exit(1);
};

const harnessDir = dirname(fileURLToPath(import.meta.url));
const coreDir =
  process.env.ROCKETCHAT_CORE_DIR ??
  resolve(harnessDir, '..', '..', '..', 'Rocket.Chat');

const main = async () => {
  const state = readState();
  const world = state.worlds?.[worldKey(port)];
  const users = usersOf(state);
  const lost = world?.rooms?.lost;
  if (!lost) fail('no lost-key room: run seed-rooms.mjs --lost-count 6000');

  const puppeteer = require('puppeteer');
  const profile = join(
    stateDir(),
    `server-${port}`,
    'browser-profiles',
    `${users.a.username}-pending`
  );
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const record = (line) => {
    const text = JSON.stringify(line);
    console.log(text);
    if (values.out) appendFileSync(values.out, `${text}\n`);
  };
  try {
    const page = await browser.newPage();
    await installE2eModule(page, coreDir);
    const cdp = await page.createCDPSession();
    await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name=usernameOrEmail]', {
      timeout: 180_000,
    });
    await page.type('input[name=usernameOrEmail]', users.a.username);
    await page.type('input[name=password]', users.a.password);
    await page.evaluate(() => document.querySelector('form').requestSubmit());
    await page.waitForFunction(
      () => !!localStorage.getItem('Meteor.loginToken'),
      { timeout: 90_000 }
    );
    await page.evaluate(() => {
      const uid = localStorage.getItem('Meteor.userId');
      localStorage.setItem('E2EESearch_FakeBackend', 'true');
      localStorage.setItem(`E2EESearch_OptIn_${uid}`, 'true');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    for (let i = 0; i < 90; i++) {
      const step = await page.evaluate(async () => {
        let mod;
        try {
          mod = await window.__harnessE2e();
        } catch {
          return 'loading';
        }
        if (mod.e2e.isReady()) return 'ready';
        if (document.querySelector('.rcx-modal input[type=password]'))
          return 'dialog';
        [...document.querySelectorAll('.rcx-banner')]
          .find((x) => /E2E/i.test(x.innerText))
          ?.querySelector('.rcx-banner__content')
          ?.click();
        return 'waiting';
      });
      if (step === 'ready') break;
      if (step === 'dialog') {
        await page.type('.rcx-modal input[type=password]', users.a.e2ePassword);
        await page.evaluate(() =>
          document.querySelector('.rcx-modal .rcx-button--primary')?.click()
        );
      }
      await sleep(2000);
    }
    log('A logged in with a new profile; waiting for the crawler');

    const sample = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const heap = await cdp.send('Runtime.getHeapUsage');
      const progress = await page.evaluate(
        async () =>
          (await window.__harnessE2e()).e2eSearchIndexRuntime.getProgress() ??
          null
      );
      // Every Map in the heap with 1000 or more entries.
      const proto = await cdp.send('Runtime.evaluate', {
        expression: 'Map.prototype',
      });
      const maps = await cdp.send('Runtime.queryObjects', {
        prototypeObjectId: proto.result.objectId,
      });
      const sizes = await cdp.send('Runtime.callFunctionOn', {
        objectId: maps.objects.objectId,
        functionDeclaration:
          'function () { return this.map((m) => m.size).filter((n) => n >= 1000).sort((a, b) => b - a); }',
        returnByValue: true,
      });
      await cdp.send('Runtime.releaseObject', {
        objectId: maps.objects.objectId,
      });
      return {
        at: new Date().toISOString(),
        progress,
        largeMaps: sizes.result.value,
        heapUsedMB: Math.round((heap.usedSize / 1048576) * 10) / 10,
      };
    };

    const deadline = Date.now() + Number(values['max-minutes']) * 60_000;
    record({ event: 'start', ...(await sample()) });
    let last;
    while (Date.now() < deadline) {
      await sleep(30_000);
      last = await sample();
      record(last);
      const p = last.progress;
      if (p && p.rooms > 0 && p.roomsDone === p.rooms) break;
    }
    record({ event: 'end', ...last });
  } finally {
    await browser.close();
  }
};

main().catch((error) => fail(error?.stack ?? String(error)));
