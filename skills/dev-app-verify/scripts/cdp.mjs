#!/usr/bin/env node
// Drive the `yarn start` dev app through its main-process Node inspector, or
// a packaged app started with --remote-debugging-port through its CDP targets.
// Plain Node ESM with no dependencies: needs Node 22+ (global fetch and
// WebSocket). Runbook: skills/dev-app-verify/SKILL.md. Usage: --help.

// The poll loops wait for app state one step at a time, by design.
/* eslint-disable no-await-in-loop */

import vm from 'node:vm';

// setTimeout runs a longer delay at once. The socket request adds 5000 ms.
const MAX_OPTION = 2 ** 31 - 1 - 5000;

const USAGE = `Usage: node skills/dev-app-verify/scripts/cdp.mjs [options] <command> [args]

Dev app commands (main-process inspector, default port 9339):
  main '<expr>'                 Evaluate in the main process. \`require\` and
                                \`electron\` are in scope. Accepts an expression
                                or a function body with \`return\`. Await works.
                                Prints the result as JSON.
  webview <url-part> '<expr>'   Run JS in the page of the server webview whose
                                URL contains <url-part>. Prints the result as JSON.
  add-server <url>              Fill and submit the add-server form of the root
                                window. Waits for the new server webview.
  login <url-part>              Log in on that webview with DEV_APP_USER and
                                DEV_APP_PASSWORD from the environment.
  reload-webview <url-part>     Reload that webview from the root window
                                (<webview>.reload()), and check that the root
                                window did not reload.
  quit                          Call app.quit(), then wait until the port closes
                                and the main process exits. Kills nothing.

Packaged app commands (--remote-debugging-port, default port 9222):
  targets                       List the CDP targets: type | URL | id.
  eval <target> '<expr>'        Evaluate in the page, webview or iframe target
                                whose id is <target> or whose URL contains it.
  frame <target> <frame-url-part> '<expr>'
                                Evaluate in the first frame of that target whose
                                URL contains <frame-url-part>. This reaches an
                                iframe that shares the webview's process and so
                                has no target of its own. Runs in an isolated
                                world (DOM, postMessage) unless --main-world.
  The <expr> of eval and frame takes the same forms as for main.

Options:
  --port <n>      CDP port (default 9339 or 9222, see above).
  --timeout <ms>  Time limit for each command (default 30000).
  --main-world    frame: use the page's own world (page globals).
  -h, --help      Show this help.
  --              Stop option parsing (for an expression that starts with --).

Exit codes: 0 success, 1 failure (exception, timeout, no match), 2 usage error.`;

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

const redact = (text) => {
  const secret = process.env.DEV_APP_PASSWORD;
  if (!secret) {
    return String(text);
  }
  // JSON output escapes quotes and backslashes, so mask that form too.
  return [secret, JSON.stringify(secret).slice(1, -1)].reduce(
    (out, form) => out.split(form).join('***'),
    String(text)
  );
};

const print = (value) => {
  const text =
    value === undefined ? 'undefined' : JSON.stringify(value, null, 2);
  process.stdout.write(`${redact(text)}\n`);
};

const parseArgs = (argv) => {
  const options = {
    port: null,
    timeout: 30000,
    help: false,
    mainWorld: false,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }
    if (arg === '--main-world') {
      options.mainWorld = true;
      continue;
    }
    const match = /^--(port|timeout)(?:=(.*))?$/.exec(arg);
    if (match) {
      const raw = match[2] ?? argv[++i];
      const value = Number(raw);
      if (!Number.isInteger(value) || value <= 0 || value > MAX_OPTION) {
        throw new CliError(
          `--${match[1]} needs a positive integer up to ${MAX_OPTION}, got "${raw}".`,
          2
        );
      }
      options[match[1]] = value;
      continue;
    }
    if (/^--[a-z]/i.test(arg)) {
      throw new CliError(`Unknown option ${arg}. Run with --help.`, 2);
    }
    positional.push(arg);
  }
  return { options, positional };
};

// Accept `expr`, `expr;` or a function body that uses `return`.
const toFunctionBody = (code) => {
  const expression = code.trim().replace(/;+$/, '');
  try {
    // eslint-disable-next-line no-new
    new vm.Script(`(async () => (\n${expression}\n))`);
    return `return (\n${expression}\n);`;
  } catch {
    try {
      // eslint-disable-next-line no-new
      new vm.Script(`(async () => {\n${code}\n})`);
    } catch (error) {
      throw new CliError(`${error.name}: ${error.message}`);
    }
    return code;
  }
};

// A JS literal of a value, for code that this script sends to the app.
// JSON.stringify leaves <, >, / and U+2028/U+2029 unescaped. Escape them too,
// so that no value can end the code around it.
const jsLiteral = (value) =>
  JSON.stringify(value ?? null).replace(
    /[<>/\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  );

const wrapAsync = (code) => `(async () => {\n${toFunctionBody(code)}\n})()`;

// The frame can navigate after the frame-tree read. Check its URL in the same
// evaluation as the code.
const frameCode = (part, code) =>
  `(async () => {\nif (!location.href.includes(${jsLiteral(part)})) throw new Error('The frame left the matched URL: ' + location.href);\n${toFunctionBody(code)}\n})()`;

const MAIN_PRELUDE =
  "const require = process.mainModule.require.bind(process.mainModule); const electron = require('electron');";

const wrapMain = (code) =>
  `(async () => { ${MAIN_PRELUDE}\nreturn await (async () => {\n${toFunctionBody(code)}\n})(); })()`;

// Page code returns { ok, value } or { ok: false, error }, so that a page
// exception keeps its message through executeJavaScript.
const wrapPage = (body) =>
  `(async () => { try { return { ok: true, value: await (async () => {\n${body}\n})() }; } catch (error) { return { ok: false, error: String((error && error.stack) || error) }; } })()`;

const pageCall = (fn, arg) =>
  wrapPage(`return (${fn.toString()})(${jsLiteral(arg)});`);

const fetchTargets = async (port) => {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(3000),
  });
  return response.json();
};

const listTargets = async (port) => {
  try {
    return await fetchTargets(port);
  } catch (error) {
    throw new CliError(
      `No CDP endpoint answers on 127.0.0.1:${port} (${error.cause?.code ?? error.message}).\n` +
        'Dev app: start `yarn start` and wait for "waiting for changes".\n' +
        `Packaged app: start it with --remote-debugging-port=${port}.\n` +
        `Check the port with: lsof -nP -iTCP:${port} -sTCP:LISTEN`
    );
  }
};

const describeTarget = (t) => `${t.type} | ${t.url.slice(0, 120)} | ${t.id}`;

// Service workers and other workers share the server URL, so skip them.
const findTarget = (targets, part) => {
  const exact = targets.find((t) => t.id === part);
  if (exact) {
    return exact;
  }
  const matches = targets.filter(
    (t) =>
      ['page', 'webview', 'iframe'].includes(t.type) && t.url.includes(part)
  );
  if (matches.length === 1) {
    return matches[0];
  }
  throw new CliError(
    `${matches.length === 0 ? 'No' : matches.length} page, webview or iframe target URLs contain "${part}". Use a longer substring or a target id.\nTargets:${targets.map((t) => `\n  ${describeTarget(t)}`).join('')}`
  );
};

const connect = async (url, timeoutMs) => {
  const ws = new WebSocket(url);
  const pending = new Map();
  const events = [];
  let nextId = 0;
  const rejectAll = (error) => {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
  };
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method) {
      events.push(message);
    }
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      entry.resolve(message);
    }
  });
  ws.addEventListener('close', () =>
    rejectAll(
      new CliError(
        'The inspector socket closed (watcher restart or app quit?).'
      )
    )
  );

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // A pending socket keeps Node alive. Close it so the CLI exits.
      ws.close();
      reject(new CliError('Timed out while opening the inspector socket.'));
    }, 5000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new CliError('Could not open the inspector socket.'));
    });
  });

  const send = (method, params = {}, limitMs = timeoutMs) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new CliError(
            `${method} timed out after ${limitMs} ms (watcher restart, dead socket, or a promise that never settles?). The code may still run in the app.`
          )
        );
      }, limitMs);
      pending.set(id, {
        resolve: (message) => {
          clearTimeout(timer);
          // A protocol failure comes in `error`, not in `exceptionDetails`.
          if (message.error) {
            reject(
              new CliError(`${method}: CDP error: ${message.error.message}`)
            );
            return;
          }
          resolve(message);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression, limitMs = timeoutMs, params = {}) => {
    const message = await send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true, ...params },
      limitMs
    );
    const { result, exceptionDetails } = message.result;
    if (exceptionDetails) {
      throw new CliError(
        exceptionDetails.exception?.description ?? exceptionDetails.text
      );
    }
    return result.type === 'undefined' ? undefined : result.value;
  };

  return { send, evaluate, events, close: () => ws.close() };
};

const openSession = async (port, timeoutMs) => {
  const target = (await listTargets(port)).find((t) => t.webSocketDebuggerUrl);
  if (!target) {
    throw new CliError(
      `The inspector on port ${port} lists no debuggable target.`
    );
  }
  return connect(target.webSocketDebuggerUrl, timeoutMs);
};

// A cross-origin iframe can share its webview's process. Then it has no
// target of its own, and only the frame tree of the webview shows it.
const frameContext = async (session, part, mainWorld) => {
  const frames = [];
  const walk = (node) => {
    frames.push(node.frame);
    (node.childFrames ?? []).forEach(walk);
  };
  walk((await session.send('Page.getFrameTree')).result.frameTree);
  const frame = frames.find((f) => f.url.includes(part));
  if (!frame) {
    throw new CliError(
      `No frame URL contains "${part}". Frames:${frames.map((f) => `\n  ${f.url}`).join('')}`
    );
  }
  if (!mainWorld) {
    const world = await session.send('Page.createIsolatedWorld', {
      frameId: frame.id,
      worldName: 'dev-app-verify',
    });
    return world.result.executionContextId;
  }
  // Runtime.enable reports every existing context before it replies.
  await session.send('Runtime.enable');
  const created = session.events.find(
    (e) =>
      e.method === 'Runtime.executionContextCreated' &&
      e.params.context.auxData?.frameId === frame.id &&
      e.params.context.auxData?.isDefault
  );
  if (!created) {
    throw new CliError(`The frame ${frame.url} has no main-world context.`);
  }
  return created.params.context.id;
};

// Runs inside the Electron main process. It is serialized with toString(),
// so it must not use anything from this file's scope.
function mainLibrary(electron) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Root window = the one BrowserWindow that loads `app/index.html`. Other
  // windows (Downloads, Settings, Log Viewer) load their own html files.
  const rootWindow = () =>
    electron.BrowserWindow.getAllWindows().find(
      (w) =>
        !w.isDestroyed() && w.webContents.getURL().includes('/app/index.html')
    );
  const guests = () =>
    electron.webContents
      .getAllWebContents()
      .filter((wc) => !wc.isDestroyed() && wc.getType() === 'webview');
  const findGuest = (part) => {
    const all = guests();
    const matches = all.filter((wc) => wc.getURL().includes(part));
    if (matches.length === 1) {
      return { guest: matches[0] };
    }
    return {
      error:
        matches.length === 0
          ? `No webview URL contains "${part}".`
          : `${matches.length} webview URLs contain "${part}". Use a longer substring.`,
      urls: all.map((wc) => wc.getURL()),
    };
  };
  const pageEval = async (contents, source) => {
    try {
      return await contents.executeJavaScript(source, true);
    } catch (error) {
      return { ok: false, error: String((error && error.message) || error) };
    }
  };
  const menuItem = (id) =>
    electron.Menu.getApplicationMenu()?.getMenuItemById(id) ?? null;
  return { sleep, rootWindow, guests, findGuest, pageEval, menuItem };
}

const runInMain = (session, fn, args, limitMs) =>
  session.evaluate(
    `(async () => { ${MAIN_PRELUDE}\nconst lib = (${mainLibrary.toString()})(electron);\nreturn await (${fn.toString()})(lib, ${jsLiteral(args)}); })()`,
    limitMs
  );

const unwrap = (result) => {
  if (result?.ok) {
    return result.value;
  }
  const urls = result?.urls
    ? `\nWebview URLs:${result.urls.length ? result.urls.map((u) => `\n  ${u || '(empty: no page committed yet)'}`).join('') : ' (none)'}`
    : '';
  throw new CliError(`${result?.error ?? 'Unknown failure.'}${urls}`);
};

// ---------------------------------------------------------------- main-side

async function webviewInMain(lib, { part, source }) {
  const found = lib.findGuest(part);
  if (!found.guest) {
    return { ok: false, error: found.error, urls: found.urls };
  }
  return lib.pageEval(found.guest, source);
}

async function addServerInMain(
  lib,
  { url, fillSource, stateSource, timeoutMs }
) {
  const root = lib.rootWindow();
  if (!root) {
    return { ok: false, error: 'Root window not found (app still booting?).' };
  }
  // Each server <webview> has partition `persist:<server url>`.
  const partitions = await root.webContents.executeJavaScript(
    "[...document.querySelectorAll('webview')].map((v) => v.getAttribute('partition') || '')"
  );
  // Compare whole hosts: a substring check takes rocket.chat for
  // open.rocket.chat. The app accepts a URL without a scheme, so fall back to
  // the raw text.
  const hostOf = (text) => {
    try {
      return new URL(text).host || text;
    } catch {
      return text;
    }
  };
  const existing = partitions.find(
    (p) => hostOf(p.replace(/^persist:/, '')) === hostOf(url)
  );
  if (existing) {
    return {
      ok: true,
      value: {
        alreadyAdded: existing.replace(/^persist:/, ''),
        submitted: false,
      },
    };
  }
  // Track guests by id: an existing guest can navigate, and a new guest has
  // an empty URL until it commits a page.
  const before = new Set(lib.guests().map((wc) => wc.id));
  const addItem = lib.menuItem('addNewServer');
  if (!addItem) {
    return { ok: false, error: 'Menu item addNewServer not found.' };
  }
  addItem.click();

  const deadline = Date.now() + timeoutMs;
  let filled = null;
  while (Date.now() < deadline) {
    filled = await lib.pageEval(root.webContents, fillSource);
    if (filled.ok && filled.value?.ok) {
      break;
    }
    await lib.sleep(250);
  }
  if (!filled?.ok || !filled.value?.ok) {
    return {
      ok: false,
      error: `Could not fill the add-server form: ${filled?.value?.error ?? filled?.error}`,
    };
  }

  let state = null;
  while (Date.now() < deadline) {
    await lib.sleep(250);
    // A new guest has an empty URL until it commits a page.
    const added = lib.guests().find((wc) => !before.has(wc.id) && wc.getURL());
    if (added) {
      return { ok: true, value: { added: added.getURL() } };
    }
    const read = await lib.pageEval(root.webContents, stateSource);
    state = read.ok ? read.value : state;
    if (state?.error) {
      return { ok: false, error: `The form rejected the URL: ${state.error}` };
    }
  }
  return {
    ok: false,
    error: `No new server webview after ${timeoutMs} ms. Last form state: ${JSON.stringify(state)}`,
  };
}

async function loginInMain(lib, { part, stateSource, fillSource, timeoutMs }) {
  const found = lib.findGuest(part);
  if (!found.guest) {
    return { ok: false, error: found.error, urls: found.urls };
  }
  const { guest } = found;
  const readState = async () => {
    const read = await lib.pageEval(guest, stateSource);
    return read.ok ? read.value : null;
  };

  const deadline = Date.now() + timeoutMs;
  let state = await readState();
  while (!state?.form && !(state?.hasToken && !state?.form)) {
    if (Date.now() > deadline) {
      return {
        ok: false,
        error: `No login form and no login token after ${timeoutMs} ms. Last state: ${JSON.stringify(state)}`,
      };
    }
    await lib.sleep(250);
    state = await readState();
  }
  if (!state.form) {
    return { ok: true, value: { alreadyLoggedIn: true, url: state.url } };
  }

  const filled = await lib.pageEval(guest, fillSource);
  if (!filled.ok || !filled.value?.ok) {
    return {
      ok: false,
      error: `Could not fill the login form: ${filled.value?.error ?? filled.error}`,
    };
  }

  const submittedAt = Date.now();
  while (Date.now() < deadline) {
    await lib.sleep(250);
    state = (await readState()) ?? state;
    if (state.hasToken && !state.form) {
      return { ok: true, value: { loggedIn: true, url: state.url } };
    }
    if (state.dialog) {
      return {
        ok: false,
        error: `A dialog opened (two-factor prompt?). The script does not answer it: ${state.dialog}`,
      };
    }
    if (state.form && state.alerts.length && Date.now() - submittedAt > 1000) {
      return { ok: false, error: `Login failed: ${state.alerts.join(' | ')}` };
    }
  }
  return {
    ok: false,
    error: `Not logged in after ${timeoutMs} ms. Last state: ${JSON.stringify(state)}`,
  };
}

async function reloadInMain(lib, { part, timeoutMs }) {
  const found = lib.findGuest(part);
  if (!found.guest) {
    return { ok: false, error: found.error, urls: found.urls };
  }
  const { guest } = found;
  const root = lib.rootWindow();
  if (!root) {
    return { ok: false, error: 'Root window not found.' };
  }
  const timeOrigin = (contents) =>
    contents.executeJavaScript('performance.timeOrigin').catch(() => null);
  const guestBefore = await timeOrigin(guest);
  const rootBefore = await timeOrigin(root.webContents);
  if (guestBefore === null || rootBefore === null) {
    return {
      ok: false,
      error: 'Could not read performance.timeOrigin before the reload.',
    };
  }

  // Never send CDP Page.reload to the webview target: that reloads the root
  // window. Reload through the <webview> element of the root renderer.
  const clicked = await root.webContents.executeJavaScript(
    `(() => { const view = [...document.querySelectorAll('webview')].find((v) => { try { return v.getWebContentsId() === ${guest.id}; } catch { return false; } }); if (!view) return false; view.reload(); return true; })()`
  );
  if (!clicked) {
    return {
      ok: false,
      error: 'No <webview> element in the root window owns this guest.',
    };
  }

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await lib.sleep(250);
    if (guest.isDestroyed()) {
      return {
        ok: false,
        error: 'The guest webContents was destroyed during the reload.',
      };
    }
    if (guest.isLoading()) {
      continue;
    }
    const now = await timeOrigin(guest);
    if (now !== null && now !== guestBefore) {
      const rootAfter = await timeOrigin(root.webContents);
      if (rootAfter !== rootBefore) {
        return {
          ok: false,
          error:
            'The root window reloaded too (its performance.timeOrigin changed).',
        };
      }
      return {
        ok: true,
        value: {
          reloaded: guest.getURL(),
          ms: Date.now() - started,
          rootReloaded: false,
        },
      };
    }
  }
  return {
    ok: false,
    error: `The webview did not finish reloading in ${timeoutMs} ms.`,
  };
}

// ---------------------------------------------------------------- page-side

function addServerFillPage(url) {
  return (async () => {
    const input = document.querySelector('form input[placeholder^="http"]');
    if (!input) {
      return { ok: false, error: 'The add-server form is not visible.' };
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    ).set;
    setter.call(input, url);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // Let React re-render. A submit before that would send the old empty
    // value, and an empty value adds the default server.
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (input.value !== url) {
      return { ok: false, error: 'The form did not keep the typed URL.' };
    }
    const submit = input.form?.querySelector('button[type="submit"]');
    if (!submit || submit.disabled) {
      return { ok: false, error: 'The submit button is missing or disabled.' };
    }
    submit.click();
    return { ok: true };
  })();
}

function addServerStatePage() {
  const input = document.querySelector('form input[placeholder^="http"]');
  const error = input?.form
    ?.querySelector('.rcx-field__error')
    ?.textContent.trim();
  return {
    visible: Boolean(input),
    value: input?.value ?? null,
    error: error || null,
  };
}

function loginStatePage() {
  const password = document.querySelector('input[name="password"]');
  const user = document.querySelector(
    'input[name="usernameOrEmail"], input[name="emailOrUsername"], #emailOrUsername'
  );
  const hasToken = Object.keys(localStorage).some(
    (key) => key.endsWith('loginToken') && localStorage.getItem(key)
  );
  const alerts = [
    ...document.querySelectorAll('[role="alert"], [aria-live="assertive"]'),
  ]
    .map((el) => el.textContent.trim())
    .filter(Boolean);
  const dialog =
    document
      .querySelector('[role="dialog"]')
      ?.textContent.trim()
      .slice(0, 200) || null;
  return {
    form: Boolean(password && user),
    hasToken,
    alerts,
    dialog,
    url: location.href,
  };
}

function loginFillPage({ user, password, part }) {
  return (async () => {
    // Check in this evaluation: the webview can navigate after the state read.
    if (!location.href.includes(part)) {
      return { ok: false, error: `The page left "${part}": ${location.href}` };
    }
    const userInput = document.querySelector(
      'input[name="usernameOrEmail"], input[name="emailOrUsername"], #emailOrUsername'
    );
    const passwordInput = document.querySelector('input[name="password"]');
    if (!userInput || !passwordInput) {
      return { ok: false, error: 'The login form is not visible.' };
    }
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    ).set;
    for (const [input, value] of [
      [userInput, user],
      [passwordInput, password],
    ]) {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (userInput.value !== user || passwordInput.value !== password) {
      return { ok: false, error: 'The form did not keep the typed values.' };
    }
    const submit = passwordInput.form?.querySelector('button[type="submit"]');
    if (!submit) {
      return { ok: false, error: 'The login form has no submit button.' };
    }
    submit.click();
    return { ok: true };
  })();
}

// ---------------------------------------------------------------- commands

const portIsOpen = async (port) => {
  try {
    await fetchTargets(port);
    return true;
  } catch {
    return false;
  }
};

const pidIsAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

const quit = async (session, { port, timeout }) => {
  const pid = await session.evaluate(
    wrapMain('setTimeout(() => electron.app.quit(), 200); return process.pid;')
  );
  // Close our socket at once: the app waits for open debugger sessions.
  session.close();
  const started = Date.now();
  while (Date.now() - started < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const open = await portIsOpen(port);
    const alive = pidIsAlive(pid);
    if (!open && !alive) {
      process.stdout.write(
        `Quit: port ${port} closed and main process ${pid} exited after ${Date.now() - started} ms.\n`
      );
      return;
    }
  }
  throw new CliError(
    `Quit hangs: after ${timeout} ms port ${port} is ${(await portIsOpen(port)) ? 'still open' : 'closed'} and process ${pid} is ${pidIsAlive(pid) ? 'still running' : 'gone'}.\n` +
      'Dev-mode quit can hang, for example while another inspector client stays connected. Nothing was killed.\n' +
      `Check with: lsof -nP -iTCP:${port} -sTCP:LISTEN. A kill during quit can tear the profile's Local Storage leveldb log.`
  );
};

const need = (positional, count, usage) => {
  if (positional.length !== count) {
    throw new CliError(`Usage: ${usage}`, 2);
  }
};

const run = async () => {
  const { options, positional } = parseArgs(process.argv.slice(2));
  const [command, ...args] = positional;
  if (options.help || !command) {
    process.stdout.write(`${USAGE}\n`);
    if (!options.help) {
      process.exitCode = 2;
    }
    return;
  }

  const commands = {
    'main': [1, "main '<expr>'"],
    'webview': [2, "webview <url-part> '<expr>'"],
    'add-server': [1, 'add-server <url>'],
    'login': [1, 'login <url-part>'],
    'reload-webview': [1, 'reload-webview <url-part>'],
    'quit': [0, 'quit'],
    'targets': [0, 'targets'],
    'eval': [2, "eval <target> '<expr>'"],
    'frame': [3, "frame <target> <frame-url-part> '<expr>'"],
  };
  if (!commands[command]) {
    throw new CliError(`Unknown command "${command}". Run with --help.`, 2);
  }
  need(args, ...commands[command]);
  const packaged = ['targets', 'eval', 'frame'].includes(command);
  options.port ??= packaged ? 9222 : 9339;

  if (command === 'targets') {
    for (const target of await listTargets(options.port)) {
      process.stdout.write(`${describeTarget(target)}\n`);
    }
    return;
  }

  let credentials;
  if (command === 'login') {
    const { DEV_APP_USER: user, DEV_APP_PASSWORD: password } = process.env;
    if (!user || !password) {
      throw new CliError(
        'Set DEV_APP_USER and DEV_APP_PASSWORD in the environment.',
        2
      );
    }
    credentials = { user, password };
  }
  // Main-side loops use the command timeout. The socket request gets a margin.
  const limitMs = options.timeout + 5000;
  const session = packaged
    ? await connect(
        findTarget(await listTargets(options.port), args[0])
          .webSocketDebuggerUrl,
        options.timeout
      )
    : await openSession(options.port, options.timeout);
  try {
    switch (command) {
      case 'main':
        print(await session.evaluate(wrapMain(args[0])));
        break;
      case 'webview':
        print(
          unwrap(
            await runInMain(
              session,
              webviewInMain,
              { part: args[0], source: wrapPage(toFunctionBody(args[1])) },
              limitMs
            )
          )
        );
        break;
      case 'add-server':
        print(
          unwrap(
            await runInMain(
              session,
              addServerInMain,
              {
                url: args[0],
                fillSource: pageCall(addServerFillPage, args[0]),
                stateSource: pageCall(addServerStatePage),
                timeoutMs: options.timeout,
              },
              limitMs
            )
          )
        );
        break;
      case 'login':
        print(
          unwrap(
            await runInMain(
              session,
              loginInMain,
              {
                part: args[0],
                stateSource: pageCall(loginStatePage),
                fillSource: pageCall(loginFillPage, {
                  ...credentials,
                  part: args[0],
                }),
                timeoutMs: options.timeout,
              },
              limitMs
            )
          )
        );
        break;
      case 'reload-webview':
        print(
          unwrap(
            await runInMain(
              session,
              reloadInMain,
              { part: args[0], timeoutMs: options.timeout },
              limitMs
            )
          )
        );
        break;
      case 'quit':
        await quit(session, options);
        break;
      case 'eval':
        print(await session.evaluate(wrapAsync(args[1])));
        break;
      case 'frame':
        print(
          await session.evaluate(frameCode(args[1], args[2]), options.timeout, {
            contextId: await frameContext(session, args[1], options.mainWorld),
          })
        );
        break;
    }
  } finally {
    session.close();
  }
};

run()
  .catch((error) => {
    const message = error instanceof CliError ? error.message : error.stack;
    process.stderr.write(`cdp: ${redact(message)}\n`);
    process.exitCode = error.exitCode ?? 1;
  })
  .finally(() => {
    // A close handshake with a stuck inspector can keep Node alive. Exit with
    // the recorded code after a grace period. The app is not touched.
    setTimeout(() => process.exit(), 1000).unref();
  });
