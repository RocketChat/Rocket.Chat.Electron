// Makes the known test world of the E2EE search harness on a fresh server.
//
//   node seed.mjs [--port <port>]
//
// It uses the REST API with the admin user and two headless Chrome pages
// (puppeteer from the desktop repository), so the real web client makes the
// E2E keys, the room key and the encrypted messages:
//   - settings: E2EE and local search on, two-factor login and rate limits off;
//   - users A (the desktop user) and B (the peer), with generated passwords;
//   - the E2E keys of A and B, and the E2E password of each (state file only);
//   - one encrypted private group with A and B, where B sends two messages,
//     A sends one, and B sends one file with a caption, each with its own
//     needle word;
//   - one plain public channel with a control word, which must never go into
//     the local index.
//
// When the world exists and the state file knows it, the script prints
// "world exists" and exits 0. When the users exist but the state file does
// not know the world, it fails: run `server.sh reset` first. A reset and a
// seed always give the same world (the same words and names; new ids).
//
// The state file gets the ids of the needle messages. Nothing secret is
// printed.

import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  ensureCredentials,
  readState,
  stateDir,
  writeState,
} from './state.mjs';

const harnessDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(harnessDir, '..', '..');

const { values } = parseArgs({ options: { port: { type: 'string' } } });
const port = Number(values.port ?? process.env.HARNESS_PORT ?? 3500);
const host = process.env.HARNESS_HOST ?? 'localhost';
const base = `http://${host}:${port}`;

export const WORLD = {
  group: 'harness-e2ee-room',
  control: 'harness-plain-room',
  controlWord: 'harnesscontrolplain',
  // In the order that they are sent. The first one is the oldest.
  needles: [
    { key: 'bravo', word: 'harnessneedlebravo', author: 'b', kind: 'text' },
    { key: 'charlie', word: 'harnessneedlecharlie', author: 'b', kind: 'text' },
    { key: 'alpha', word: 'harnessneedlealpha', author: 'a', kind: 'text' },
    { key: 'file', word: 'harnessneedlefile', author: 'b', kind: 'file' },
  ],
};

const SETTINGS = [
  ['Accounts_TwoFactorAuthentication_Enabled', false],
  ['Accounts_TwoFactorAuthentication_By_Email_Auto_Opt_In', false],
  ['API_Enable_Rate_Limiter', false],
  ['DDP_Rate_Limit_IP_Enabled', false],
  ['DDP_Rate_Limit_User_Enabled', false],
  ['DDP_Rate_Limit_Connection_Enabled', false],
  ['DDP_Rate_Limit_User_By_Method_Enabled', false],
  ['DDP_Rate_Limit_Connection_By_Method_Enabled', false],
  ['E2E_Enable', true],
  ['E2E_Enable_Local_Search', true],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...message) =>
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...message);
const fail = (message, code = 1) => {
  console.error(`seed: ${message}`);
  process.exit(code);
};

const loadPuppeteer = () => {
  for (const dir of [repoRoot, process.env.DESKTOP_DIR].filter(Boolean)) {
    try {
      return createRequire(join(dir, 'package.json'))('puppeteer');
    } catch {
      // Try the next checkout.
    }
  }
  return fail(
    'puppeteer not found: run yarn install in the desktop repository'
  );
};

const rest = async (
  path,
  { method = 'GET', body, auth, twoFactorPassword } = {}
) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    headers['X-User-Id'] = auth.userId;
    headers['X-Auth-Token'] = auth.authToken;
  }
  if (twoFactorPassword) {
    headers['X-2fa-method'] = 'password';
    headers['X-2fa-code'] = createHash('sha256')
      .update(twoFactorPassword)
      .digest('hex');
  }
  const response = await fetch(`${base}/api/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  return response
    .json()
    .catch(() => ({ success: false, error: `HTTP ${response.status}` }));
};

const loginAdmin = async (admin) => {
  for (let i = 0; i < 60; i++) {
    const result = await rest('login', {
      method: 'POST',
      body: { user: admin.username, password: admin.password },
    }).catch(() => undefined);
    if (result?.status === 'success') return result.data;
    await sleep(2000);
  }
  return fail(
    'the admin user cannot log in (was the server started by server.sh with this state file?)'
  );
};

const applySettings = async (admin, auth) => {
  for (const [id, value] of SETTINGS) {
    const result = await rest(`settings/${id}`, {
      method: 'POST',
      body: { value },
      auth,
      twoFactorPassword: admin.password,
    });
    if (!result.success)
      fail(`setting ${id} failed: ${result.error ?? JSON.stringify(result)}`);
  }
  log(
    `settings applied: ${SETTINGS.map(([id, value]) => `${id}=${value}`).join(' ')}`
  );
};

// The world exists when user A can log in and still reads the encrypted
// group of the state file.
const worldStillThere = async (world, userA) => {
  if (!world?.group?.rid || !userA?.password) return false;
  const login = await rest('login', {
    method: 'POST',
    body: { user: userA.username, password: userA.password },
  });
  if (login.status !== 'success') return false;
  const result = await rest(`groups.info?roomId=${world.group.rid}`, {
    auth: login.data,
  });
  return result.success === true && result.group?._id === world.group.rid;
};

// Opens the "Save your new E2EE password" dialog from its banner and clicks
// "I saved my password". The web client then removes the random password
// from local storage.
const confirmSavedPassword = async (page) => {
  for (let i = 0; i < 20; i++) {
    const done = await page.evaluate(
      () => !localStorage.getItem('e2e.randomPassword')
    );
    if (done) return true;
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('.rcx-modal button')].find(
        (b) => /I saved my password/i.test(b.innerText)
      );
      if (button) {
        button.click();
        return;
      }
      [...document.querySelectorAll('.rcx-banner')]
        .find((banner) => /E2EE password/i.test(banner.innerText))
        ?.querySelector('.rcx-banner__content')
        ?.click();
    });
    await sleep(1500);
  }
  return false;
};

// Saves a screenshot and the page text when a step fails, so the cause is
// visible without a rerun.
const saveDiagnostics = async (client, label, dir) => {
  try {
    await client.page.screenshot({
      path: join(dir, `seed-failure-${label}.png`),
    });
    const text = await client.page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, ' ').slice(0, 600)
    );
    console.error(`seed: page of ${label} at ${client.page.url()}: ${text}`);
  } catch {
    // The page is gone.
  }
};

// One headless Chrome with the profile of one user. `fresh` deletes the
// profile first. Without it, the page keeps the login and the E2E keys of
// the last session.
const launchClient = async (puppeteer, user, profilesDir, { fresh }) => {
  const profile = join(profilesDir, user.username);
  if (fresh) rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: profile,
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const api = (path, method = 'GET', body) =>
    page.evaluate(
      async (path, method, body) => {
        const response = await fetch(`/api/v1/${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': localStorage.getItem('Meteor.userId'),
            'X-Auth-Token': localStorage.getItem('Meteor.loginToken'),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        return response.json();
      },
      path,
      method,
      body
    );
  return { browser, page, api };
};

// Logs the user in for the first time. The web client makes the E2E keys.
const openClient = async (puppeteer, user, profilesDir) => {
  const { browser, page, api } = await launchClient(
    puppeteer,
    user,
    profilesDir,
    { fresh: true }
  );
  await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name=usernameOrEmail]', {
    timeout: 180_000,
  });
  await page.type('input[name=usernameOrEmail]', user.username);
  await page.type('input[name=password]', user.password);
  await page.evaluate(() => document.querySelector('form').requestSubmit());
  await page.waitForFunction(
    () => !!localStorage.getItem('Meteor.loginToken'),
    { timeout: 90_000 }
  );
  const userId = await page.evaluate(() =>
    localStorage.getItem('Meteor.userId')
  );
  // The web client makes the E2E keys at the first login and keeps the new
  // random E2E password in local storage until the user confirms it.
  const handle = await page
    .waitForFunction(() => localStorage.getItem('e2e.randomPassword'), {
      timeout: 120_000,
    })
    .catch(() => undefined);
  const e2ePassword = handle ? await handle.jsonValue() : undefined;
  if (!e2ePassword)
    fail(
      `no E2E password for ${user.username}: the web client made no E2E keys`
    );
  // E2EE stays in the "save password" state, with no composer in encrypted
  // rooms, until the user confirms that the password is saved.
  const confirmed = await confirmSavedPassword(page);
  if (!confirmed)
    fail(`the save-password dialog of ${user.username} did not close`);
  for (let i = 0; i < 30; i++) {
    const key = await api('e2e.fetchMyPublicKey');
    if (key.public_key) break;
    if (i === 29) fail(`the server has no E2E public key for ${user.username}`);
    await sleep(2000);
  }
  return { browser, page, api, userId, e2ePassword };
};

// Polls the subscription of the user (REST login of that user) until it
// holds a suggested room key or the room key.
const waitForSuggestedKey = async (user, rid, timeoutMs = 90_000) => {
  const login = await rest('login', {
    method: 'POST',
    body: { user: user.username, password: user.password },
  });
  if (login.status !== 'success') return false;
  const auth = login.data;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { subscription } = await rest(`subscriptions.getOne?roomId=${rid}`, {
      auth,
    });
    if (subscription?.E2ESuggestedKey || subscription?.E2EKey) return true;
    await sleep(2000);
  }
  return false;
};

const composer = 'textarea[name=msg]';

// The id of the first message in the list whose text holds `word` and that
// the server confirmed.
const messageIdWith = (page, word, timeout = 90_000) =>
  page
    .waitForFunction(
      (word) =>
        [...document.querySelectorAll('[role=listitem][data-id]')].find(
          (element) =>
            element.innerText.includes(word) &&
            element.getAttribute('aria-busy') !== 'true'
        )?.dataset.id,
      { timeout, polling: 500 },
      word
    )
    .then((handle) => handle.jsonValue());

const sendText = async (client, text, word) => {
  await client.page.waitForSelector(composer, { timeout: 120_000 });
  await client.page.focus(composer);
  await client.page.keyboard.type(text);
  await client.page.keyboard.press('Enter');
  return messageIdWith(client.page, word);
};

const sendFile = async (client, filePath, caption, word) => {
  await client.page.waitForSelector(composer, { timeout: 120_000 });
  const input = await client.page.$('input[type=file]');
  if (!input) fail('no file input in the composer');
  await input.uploadFile(filePath);
  await sleep(2000);
  await client.page.focus(composer);
  await client.page.keyboard.type(caption);
  await client.page.keyboard.press('Enter');
  return messageIdWith(client.page, word, 120_000);
};

const main = async () => {
  const state = ensureCredentials();
  const { admin, users } = state;
  const adminAuth = await loginAdmin(admin);
  log(`admin logged in to ${base}`);
  await applySettings(admin, adminAuth);

  const existingA = await rest(`users.info?username=${users.a.username}`, {
    auth: adminAuth,
  });
  if (existingA.success) {
    if (await worldStillThere(state.worlds?.[port], users.a)) {
      log('world exists: nothing to do');
      return;
    }
    fail(
      `user ${users.a.username} exists but the state file does not know its world: run server.sh reset first`,
      3
    );
  }

  for (const user of [users.a, users.b]) {
    const result = await rest('users.create', {
      method: 'POST',
      auth: adminAuth,
      body: {
        username: user.username,
        email: user.email,
        name: user.name,
        password: user.password,
        verified: true,
        requirePasswordChange: false,
        joinDefaultChannels: false,
      },
    });
    if (!result.success)
      fail(`users.create ${user.username} failed: ${result.error}`);
  }
  log(`users created: A=${users.a.username} B=${users.b.username}`);

  const puppeteer = loadPuppeteer();
  const profilesDir = join(stateDir(), `server-${port}`, 'browser-profiles');
  let a = await openClient(puppeteer, users.a, profilesDir);
  // A stays offline until B shared the room key. At its next start, the
  // client of A imports the key that B suggested.
  await a.browser.close();
  const b = await openClient(puppeteer, users.b, profilesDir);
  users.a.id = a.userId;
  users.a.e2ePassword = a.e2ePassword;
  users.b.id = b.userId;
  users.b.e2ePassword = b.e2ePassword;
  writeState(state);
  log(
    'E2E keys made for A and B by the web client; E2E passwords saved to the state file'
  );

  try {
    // B creates the room alone and invites A later. An invite puts A in the
    // room's queue of users who wait for the key, and the client of B gives
    // a key to each user in that queue every 10 s. A member named at
    // creation gets a key only when the client of B sees that member when it
    // creates the room key, which is a race.
    const created = await b.api('groups.create', 'POST', {
      name: WORLD.group,
      extraData: { encrypted: true },
    });
    if (!created.success) fail(`groups.create failed: ${created.error}`);
    const rid = created.group._id;
    log(`encrypted group ${WORLD.group} created (${rid})`);

    await b.page.goto(`${base}/group/${WORLD.group}`, {
      waitUntil: 'domcontentloaded',
    });
    await b.page.waitForSelector(composer, { timeout: 120_000 });
    await sleep(5000);

    const sent = {};
    const needle = (key) => WORLD.needles.find((n) => n.key === key);
    sent.bravo = await sendText(
      b,
      `the ${needle('bravo').word} message from the peer`,
      needle('bravo').word
    );
    sent.charlie = await sendText(
      b,
      `a second ${needle('charlie').word} message`,
      needle('charlie').word
    );

    const invited = await b.api('groups.invite', 'POST', {
      roomId: rid,
      username: users.a.username,
    });
    if (!invited.success) fail(`groups.invite failed: ${invited.error}`);
    const suggested = await waitForSuggestedKey(users.a, rid);
    if (!suggested) fail('B did not give A the room key in 90 s');
    log('A invited; the client of B gave A the room key');

    a = {
      ...a,
      ...(await launchClient(puppeteer, users.a, profilesDir, {
        fresh: false,
      })),
    };
    await a.page.goto(`${base}/group/${WORLD.group}`, {
      waitUntil: 'domcontentloaded',
    });
    // A reads the messages of B only when A imported the room key.
    await messageIdWith(a.page, needle('charlie').word, 120_000);
    sent.alpha = await sendText(
      a,
      `the ${needle('alpha').word} reply from the desktop user`,
      needle('alpha').word
    );

    const attachment = join(profilesDir, 'harness-attachment.txt');
    writeFileSync(attachment, 'attachment body for the search harness\n');
    sent.file = await sendFile(
      b,
      attachment,
      `${needle('file').word} caption of the file`,
      needle('file').word
    );
    await messageIdWith(a.page, needle('file').word, 120_000);
    log('A reads all four encrypted messages');

    // The server must hold only ciphertext for each needle message.
    for (const { key, word } of WORLD.needles) {
      const { message } = await b.api(`chat.getMessage?msgId=${sent[key]}`);
      if (
        !message ||
        message.t !== 'e2e' ||
        JSON.stringify(message).includes(word)
      ) {
        fail(`message ${key} is not stored encrypted on the server`);
      }
    }
    log('the server stores the four needle messages as e2e ciphertext');

    const channel = await a.api('channels.create', 'POST', {
      name: WORLD.control,
      members: [users.b.username],
    });
    if (!channel.success) fail(`channels.create failed: ${channel.error}`);
    const posted = await a.api('chat.postMessage', 'POST', {
      roomId: channel.channel._id,
      text: `the ${WORLD.controlWord} message in a plain room`,
    });
    if (!posted.success) fail(`chat.postMessage failed: ${posted.error}`);
    log(`plain channel ${WORLD.control} with the control word created`);

    const fresh = readState();
    fresh.users = users;
    fresh.worlds ??= {};
    fresh.worlds[port] = {
      server: base,
      seededAt: new Date().toISOString(),
      group: { name: WORLD.group, rid },
      control: {
        name: WORLD.control,
        rid: channel.channel._id,
        word: WORLD.controlWord,
        id: posted.message._id,
      },
      needles: WORLD.needles.map((n) => ({ ...n, id: sent[n.key] })),
    };
    writeState(fresh);
    log(
      `world seeded: ${WORLD.needles.map((n) => `${n.key}=${sent[n.key]}`).join(' ')}`
    );
  } catch (error) {
    if (a.page && !a.page.isClosed())
      await saveDiagnostics(a, 'a', profilesDir);
    await saveDiagnostics(b, 'b', profilesDir);
    throw error;
  } finally {
    await a.browser.close().catch(() => undefined);
    await b.browser.close().catch(() => undefined);
  }
};

await main().catch((error) => fail(error?.stack ?? String(error)));
