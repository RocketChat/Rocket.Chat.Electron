// Drives the packaged app through CDP for the E2EE search harness.
//
//   node app.mjs <command> [--cdp-port <port>] [--out <file>] [--timeout <s>]
//                [--world <name>]
//
// It reads the users and the test world from the state file (see seed.mjs).
// --world selects a named world (the same name as for seed.mjs).
// It prints one JSON line and exits with 1 when the step fails. The output
// holds message ids and counts, never a password or a token.
//
// Commands:
//   sealed        logs A in without the E2E password, opens the index
//                 through the bridge with no wrap key, and then searches the
//                 oldest needle. A has an E2EE key on the server, so the open
//                 must return `locked: true` and the search must fail with
//                 the locked error. Run it before setup.
//   setup         logs A in, enters A's E2E password, and turns on the
//                 local search opt-in in Account > Security.
//   wait-index    waits until the real history crawler of the web client
//                 indexed every needle (bridge searches only, no upserts).
//   search        searches each needle and the control word through
//                 RocketChatDesktop.e2eeSearch.
//   ui-search     searches the oldest needle in the search panel of the
//                 encrypted room and saves a crop of the panel to --out.
//   after-restart waits until the web client opens the index again, then
//                 reads the index size and searches the oldest needle.
//   at-rest       asks the main process for the index stats of each server,
//                 through the root window store, and prints `atRest`.
//   quit          asks the app to close through CDP (Browser.close). It does
//                 not wait until the app exits.
//
// The bridge calls run in the page of the server webview, so they use the
// index that the web client opened for its own document.

import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';

import {
  connect,
  findTarget,
  isRootWindow,
  isServerWebview,
  sleep,
} from './cdp.mjs';
import { readState, usersOf, worldKey } from './state.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'cdp-port': { type: 'string' },
    'out': { type: 'string' },
    'timeout': { type: 'string' },
    'port': { type: 'string' },
    'world': { type: 'string' },
  },
});
const command = positionals[0];
const cdpPort = Number(values['cdp-port'] ?? process.env.CDP_PORT ?? 9444);
const serverPort = values.port ?? process.env.HARNESS_PORT ?? '3500';
const serverHost = `${process.env.HARNESS_HOST ?? 'localhost'}:${serverPort}`;
const timeoutMs = Number(values.timeout ?? 300) * 1000;

const worldName = values.world ?? '';
const state = readState();
const world = state.worlds?.[worldKey(serverPort, worldName)];
const userA = usersOf(state, worldName)?.a;

const print = (result) => console.log(JSON.stringify(result));
const finish = (ok, result) => {
  print({ ok, ...result });
  process.exit(ok ? 0 : 1);
};

if (!world || !userA?.e2ePassword) {
  finish(false, {
    error: `no seeded world ${worldKey(serverPort, worldName)}: run seed.mjs`,
  });
}

const openWebview = async (waitMs = 120_000) => {
  const target = await findTarget(cdpPort, isServerWebview(serverHost), waitMs);
  if (!target)
    finish(false, {
      error: `no webview for ${serverHost} on CDP port ${cdpPort}`,
    });
  return connect(target);
};

// Moves the web client to a path without a page load.
const navigate = (page, path) =>
  page.evaluate(`(() => {
    history.pushState({}, '', ${JSON.stringify(path)});
    dispatchEvent(new PopStateEvent('popstate'));
    return true;
  })()`);

const bridgeSearch = (page, text, limit = 20) =>
  page.evaluate(`(async () => {
    try {
      const hits = await window.RocketChatDesktop.e2eeSearch.search({ text: ${JSON.stringify(text)}, limit: ${limit} });
      return { ids: hits.map((hit) => hit.id) };
    } catch (error) {
      return { error: String(error?.message ?? error) };
    }
  })()`);

const bridgeStats = (page) =>
  page.evaluate(`(async () => {
    try {
      return await window.RocketChatDesktop.e2eeSearch.stats();
    } catch (error) {
      return { error: String(error?.message ?? error) };
    }
  })()`);

const userIdOf = (page) =>
  page.evaluate("localStorage.getItem('Meteor.userId')");

const login = async (page) => {
  if (await userIdOf(page)) return true;
  const form = await page.waitFor(
    "!!document.querySelector('input[name=usernameOrEmail]')",
    120_000
  );
  if (!form) return false;
  await page.type(
    'document.querySelector("input[name=usernameOrEmail]")',
    userA.username
  );
  await page.type(
    'document.querySelector("input[name=password]")',
    userA.password
  );
  await page.evaluate("document.querySelector('form').requestSubmit()");
  return Boolean(
    await page.waitFor("localStorage.getItem('Meteor.userId')", 60_000)
  );
};

// The banner "Enter your E2E password" opens a dialog. The private key is in
// local storage once the password decrypted it.
const unlockE2E = async (page) => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await page.evaluate("!!localStorage.getItem('private_key')"))
      return true;
    const input = await page.evaluate(
      "!!document.querySelector('.rcx-modal input[name=password]')"
    );
    if (input) {
      await page.type(
        "document.querySelector('.rcx-modal input[name=password]')",
        userA.e2ePassword
      );
      await page.click(
        "[...document.querySelectorAll('.rcx-modal button')].find((b) => /Enable encryption/i.test(b.innerText))"
      );
      await page.waitFor("!!localStorage.getItem('private_key')", 20_000);
      continue;
    }
    await page.click(
      "[...document.querySelectorAll('.rcx-banner')].find((b) => /E2E/.test(b.innerText))?.querySelector('.rcx-banner__content')"
    );
    await sleep(2000);
  }
  return false;
};

// The toggle "Index my encrypted messages on this device" in Account >
// Security. It writes E2EESearch_OptIn_<user id> in local storage.
const optIn = async (page) => {
  const uid = await userIdOf(page);
  const key = `E2EESearch_OptIn_${uid}`;
  if (
    (await page.evaluate(`localStorage.getItem(${JSON.stringify(key)})`)) ===
    'true'
  )
    return true;
  await navigate(page, '/account/security');
  const toggle = `document.getElementById([...document.querySelectorAll('label[for]')]
    .find((l) => /Index my encrypted messages/i.test(l.innerText))?.htmlFor ?? '')`;
  if (!(await page.waitFor(`!!(${toggle})`, 60_000))) return false;
  await page.click(`(${toggle}).closest('label') ?? (${toggle})`);
  const on = await page.waitFor(
    `localStorage.getItem(${JSON.stringify(key)}) === 'true'`,
    10_000
  );
  await navigate(page, '/home');
  return Boolean(on);
};

const searchAll = async (page) => {
  const needles = {};
  for (const needle of world.needles) {
    const result = await bridgeSearch(page, needle.word);
    needles[needle.key] = {
      expected: needle.id,
      ...result,
      found: Boolean(result.ids?.includes(needle.id)),
    };
  }
  const control = await bridgeSearch(page, world.control.word);
  return { needles, control };
};

const LOCKED_ERROR = 'E2EE search index is locked';

const commands = {
  async 'sealed'() {
    const page = await openWebview();
    const loggedIn = await login(page);
    if (!loggedIn) finish(false, { step: 'login', loggedIn });
    // The main process asks the server who owns the login token.
    await page.waitFor("!!localStorage.getItem('Meteor.loginToken')", 30_000);
    // The check proves only the state before E2E unlock.
    if (await page.evaluate("!!localStorage.getItem('private_key')"))
      finish(false, { step: 'precondition', error: 'E2E is already unlocked' });
    const uid = await userIdOf(page);
    const open = await page.evaluate(`(async () => {
      try {
        return { result: await window.RocketChatDesktop.e2eeSearch.open({ userId: ${JSON.stringify(uid)} }) };
      } catch (error) {
        return { error: String(error?.message ?? error) };
      }
    })()`);
    const search = await bridgeSearch(page, world.needles[0].word);
    const locked = open.result?.locked === true;
    const searchLocked = Boolean(search.error?.includes(LOCKED_ERROR));
    finish(locked && searchLocked, {
      locked,
      open: open.result ?? { error: open.error },
      searchLocked,
      search: search.error ?? `${search.ids?.length} hits`,
    });
  },

  async 'setup'() {
    const page = await openWebview();
    const loggedIn = await login(page);
    if (!loggedIn) finish(false, { step: 'login', loggedIn });
    const e2eReady = await unlockE2E(page);
    if (!e2eReady) finish(false, { step: 'e2e-unlock', loggedIn, e2eReady });
    const optedIn = await optIn(page);
    finish(optedIn, { step: 'opt-in', loggedIn, e2eReady, optedIn });
  },

  async 'wait-index'() {
    const page = await openWebview();
    const start = Date.now();
    let last;
    while (Date.now() - start < timeoutMs) {
      last = await searchAll(page);
      if (Object.values(last.needles).every((n) => n.found)) {
        finish(true, {
          elapsedS: Math.round((Date.now() - start) / 1000),
          stats: await bridgeStats(page),
        });
      }
      await sleep(5000);
    }
    finish(false, {
      error: `not every needle indexed in ${timeoutMs / 1000} s`,
      last,
      stats: await bridgeStats(page),
    });
  },

  async 'search'() {
    const page = await openWebview();
    const result = await searchAll(page);
    const ok =
      Object.values(result.needles).every((n) => n.found) &&
      result.control.ids !== undefined &&
      result.control.ids.length === 0;
    const summary = [
      ...Object.entries(result.needles).map(
        ([key, n]) =>
          `${key}=${n.ids?.length ?? n.error}hit${n.found ? '/id-match' : '/NO-id-match'}`
      ),
      `control=${result.control.ids?.length ?? result.control.error}hit`,
    ].join(' ');
    finish(ok, { summary, ...result });
  },

  async 'ui-search'() {
    const page = await openWebview();
    const needle = world.needles[0];
    await navigate(page, `/group/${world.group.name}/rocket-search`);
    const input = "document.querySelector('input[name=searchText]')";
    if (!(await page.waitFor(`!!${input}`, 60_000)))
      finish(false, { error: 'no search panel' });
    await sleep(1000);
    await page.type(input, needle.word);
    const hit = `[...document.querySelectorAll('[data-qa=local-message-search-hit]')].find((h) => h.innerText.includes(${JSON.stringify(needle.word)}))`;
    const shown = Boolean(await page.waitFor(`!!(${hit})`, 30_000));
    await sleep(1000);
    const panel = `${input}.closest('aside, [role=dialog], .rcx-vertical-bar')`;
    const hits = await page.evaluate(
      `document.querySelectorAll('[data-qa=local-message-search-hit]').length`
    );
    const png = await page.screenshotElement(panel);
    if (png && values.out) writeFileSync(values.out, png);
    finish(shown && Boolean(png), {
      needle: needle.key,
      hits,
      shown,
      screenshot: values.out,
    });
  },

  async 'after-restart'() {
    const page = await openWebview();
    const start = Date.now();
    let stats;
    while (Date.now() - start < timeoutMs) {
      stats = await bridgeStats(page);
      if (!stats.error) break;
      await sleep(250);
    }
    if (stats?.error)
      finish(false, { error: `the index did not open: ${stats.error}` });
    const openedAfterMs = Date.now() - start;
    const needle = world.needles[0];
    const result = await bridgeSearch(page, needle.word);
    finish(stats.docs > 0 && Boolean(result.ids?.includes(needle.id)), {
      openedAfterMs,
      docs: stats.docs,
      needle: needle.key,
      found: Boolean(result.ids?.includes(needle.id)),
    });
  },

  async 'at-rest'() {
    const target = await findTarget(cdpPort, isRootWindow, 30_000);
    if (!target) finish(false, { error: 'no root window target' });
    const root = await connect(target);
    // The renderer store is not global: find the react-redux Provider in the
    // React tree of the root element. A dispatch in the renderer is forwarded
    // to the main process, which answers with the stats.
    const result = await root.evaluate(`(async () => {
      const container = document.getElementById('root');
      const key = container && Object.keys(container).find((k) => k.startsWith('__reactContainer'));
      let fiber = key && container[key];
      let store;
      const stack = fiber ? [fiber] : [];
      while (stack.length && !store) {
        const node = stack.pop();
        const candidate = node.memoizedProps?.store;
        if (candidate?.getState && candidate?.dispatch) store = candidate;
        if (node.sibling) stack.push(node.sibling);
        if (node.child) stack.push(node.child);
      }
      if (!store) return { error: 'no redux store in the root window' };
      store.dispatch({ type: 'settings/e2ee-search-index-stats-requested' });
      for (let i = 0; i < 40; i++) {
        const stats = store.getState().e2eeSearchIndexStats;
        if (Array.isArray(stats) && stats.length) return { stats };
        await new Promise((r) => setTimeout(r, 250));
      }
      return { error: 'no index stats from the main process' };
    })()`);
    if (result.error) finish(false, result);
    const server = result.stats.find((s) => s.serverUrl?.includes(serverHost));
    finish(server?.atRest === 'encrypted', {
      atRest: server?.atRest,
      docs: server?.docs,
      users: server?.users,
      bytesOnDisk: server?.bytesOnDisk,
    });
  },

  async 'quit'() {
    const version = await fetch(`http://127.0.0.1:${cdpPort}/json/version`, {
      signal: AbortSignal.timeout(5000),
    })
      .then((response) => response.json())
      .catch(() => undefined);
    if (!version?.webSocketDebuggerUrl)
      finish(false, { error: `no browser target on CDP port ${cdpPort}` });
    // The app can close the connection before it answers.
    const answer = await new Promise((resolve) => {
      const ws = new WebSocket(version.webSocketDebuggerUrl);
      const timer = setTimeout(() => resolve('timeout'), 10_000);
      const done = (result) => {
        clearTimeout(timer);
        resolve(result);
      };
      ws.addEventListener('open', () =>
        ws.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
      );
      ws.addEventListener('message', () => done('answered'));
      ws.addEventListener('close', () => done('closed'));
      ws.addEventListener('error', () => done('error'));
    });
    finish(answer === 'answered' || answer === 'closed', { answer });
  },
};

if (!commands[command]) {
  finish(false, {
    error: `unknown command '${command}'; use one of ${Object.keys(commands).join(', ')}`,
  });
}
await commands[command]();
