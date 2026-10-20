import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { dirname, extname, join, resolve, sep } from 'path';

import puppeteer from 'puppeteer';
import type { Page } from 'puppeteer';

import type {
  Build,
  Failure,
  PhaseName,
  PhaseRecord,
  RecordedEvent,
  World,
} from './webSignals.lib';
import {
  PHASE_EXPECTATIONS,
  buildRecorderSource,
  datasetKey,
  evaluatePhase,
  evaluateUnreadGrowth,
  parseBuilds,
  parseTimeout,
  prepareIndexHtml,
  readFlag,
  routeRequest,
} from './webSignals.lib';

type Flags = {
  server?: string;
  user: string;
  password: string;
  builds: Build[];
  bundleTag: string;
  bundleDir?: string;
  out?: string;
  timeoutMs: number;
  help: boolean;
};

const parseFlags = (argv: string[]): Flags => {
  return {
    server: readFlag(argv, '--server'),
    user: readFlag(argv, '--user') ?? 'mosdat-admin',
    password: readFlag(argv, '--password') ?? 'mosdat-admin-pass',
    builds: parseBuilds(readFlag(argv, '--build')),
    bundleTag: readFlag(argv, '--bundle-tag') ?? 'develop',
    bundleDir: readFlag(argv, '--bundle-dir'),
    out: readFlag(argv, '--out'),
    timeoutMs: parseTimeout(readFlag(argv, '--timeout')),
    help: argv.includes('--help') || argv.includes('-h'),
  };
};

const printHelp = (): void => {
  console.log(`
  Web Signals Probe

  Checks that a Rocket.Chat server's web client still fires the window
  events the desktop app reads (startup, unread-changed*, status-changed,
  Custom_Script_Logged_In/Out, notification), in the page world and in an
  isolated world (what a preload sees).

  Usage: yarn probe:web-signals --server <url> [options]

  Options:
    --server <url>        Server to probe. Use a disposable server: the
                          probe logs the admin user out of every session.
                          The vite build needs a server on the root path.
    --user <name>         Admin username (default: mosdat-admin).
    --password <pass>     Admin password (default: mosdat-admin-pass).
    --build <b>           meteor, vite or both (default: both). meteor loads
                          the client the server serves. vite loads the
                          standalone client bundle, as the UI preview does.
    --bundle-tag <tag>    ghcr.io/rocketchat/rocket.chat-web tag for the vite
                          build (default: develop).
    --bundle-dir <dir>    Use an extracted bundle instead of pulling one.
    --out <file>          Write the full JSON report to this file.
    --timeout <ms>        Wait per phase for the expected events
                          (default: 20000).
    -h, --help            Show this help.

  Exit code 1 when an expected event is missing in either world.
`);
};

const BUNDLE_REPOSITORY = 'rocketchat/rocket.chat-web';
const REST_TIMEOUT_MS = 30000;
const DOWNLOAD_TIMEOUT_MS = 180000;

const pullBundle = async (tag: string): Promise<string> => {
  const { token } = await (
    await fetch(
      `https://ghcr.io/token?scope=repository:${BUNDLE_REPOSITORY}:pull`,
      { signal: AbortSignal.timeout(REST_TIMEOUT_MS) }
    )
  ).json();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.oci.image.manifest.v1+json',
  };
  const manifest = await (
    await fetch(`https://ghcr.io/v2/${BUNDLE_REPOSITORY}/manifests/${tag}`, {
      headers,
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
    })
  ).json();
  const layer = manifest.layers?.[0];
  if (!layer?.digest) {
    throw new Error(`No bundle layer in ghcr.io/${BUNDLE_REPOSITORY}:${tag}`);
  }
  const blob = Buffer.from(
    await (
      await fetch(
        `https://ghcr.io/v2/${BUNDLE_REPOSITORY}/blobs/${layer.digest}`,
        { headers, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }
      )
    ).arrayBuffer()
  );
  const hash = createHash('sha256').update(blob).digest('hex');
  if (`sha256:${hash}` !== layer.digest) {
    throw new Error(`Bundle ${layer.digest} failed the digest check`);
  }
  const root = mkdtempSync(join(tmpdir(), 'web-signals-bundle-'));
  const archive = join(root, 'bundle.tgz');
  const dir = join(root, 'bundle');
  mkdirSync(dir);
  writeFileSync(archive, blob);
  // Relative paths: GNU tar on Windows reads `C:\\...` as a remote host.
  execFileSync('tar', ['-xzf', 'bundle.tgz', '-C', 'bundle'], { cwd: root });
  const revision =
    manifest.annotations?.['org.opencontainers.image.revision'] ?? 'unknown';
  console.log(
    `Pulled ghcr.io/${BUNDLE_REPOSITORY}:${tag} (revision ${revision})`
  );
  return dir;
};

type Credentials = { token: string; uid: string };

const createRestClient = (serverUrl: string) => {
  const call = async (
    path: string,
    {
      auth,
      body,
      allowFailure = false,
    }: { auth?: Credentials; body?: unknown; allowFailure?: boolean } = {}
  ): Promise<any> => {
    const response = await fetch(new URL(`api/v1/${path}`, serverUrl), {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { 'X-Auth-Token': auth.token, 'X-User-Id': auth.uid } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REST_TIMEOUT_MS),
    });
    const result = await response.json().catch(() => ({}));
    // A failed setup call would show up later as a missing event: fail here.
    if (!allowFailure && (!response.ok || result.success === false)) {
      throw new Error(
        `${path} failed (HTTP ${response.status}): ${JSON.stringify(result)}`
      );
    }
    return result;
  };

  const login = async (user: string, password: string) => {
    let result = await call('login', {
      body: { user, password },
      allowFailure: true,
    });
    // The server rate-limits logins ("You must wait 3 seconds ..."). The
    // probe logs in several times per build, so wait and retry a few times.
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = /wait (\d+) seconds?/.exec(String(result.error ?? ''));
      if (!wait) break;
      await new Promise((r) => setTimeout(r, (Number(wait[1]) + 1) * 1000));
      result = await call('login', {
        body: { user, password },
        allowFailure: true,
      });
    }
    if (result.status !== 'success') {
      throw new Error(`Login as ${user} failed: ${JSON.stringify(result)}`);
    }
    return {
      token: result.data.authToken,
      uid: result.data.userId,
    } as Credentials;
  };

  return { call, login };
};

const SENDER = {
  username: 'web-signals-sender',
  password: 'web-signals-Sender-1!',
  email: 'web-signals-sender@example.invalid',
};

const MIME: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const serveViteBundle = async (
  page: Page,
  serverUrl: string,
  bundleDir: string
): Promise<void> => {
  const serverOrigin = new URL(serverUrl).origin;
  const root = resolve(bundleDir);
  const indexHtml = prepareIndexHtml(
    readFileSync(join(root, 'index.html'), 'utf8'),
    serverUrl
  );
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    const route = routeRequest({
      url,
      serverOrigin,
      method: request.method(),
      isDocument: request.resourceType() === 'document',
    });
    if (route === 'server') {
      void request.continue();
      return;
    }
    if (route === 'index') {
      void request.respond({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: indexHtml,
      });
      return;
    }
    const file = resolve(root, `.${url.pathname}`);
    if (!file.startsWith(root + sep) || !existsSync(file)) {
      void request.respond({ status: 404, body: '' });
      return;
    }
    void request.respond({
      status: 200,
      contentType: MIME[extname(file)] ?? 'application/octet-stream',
      body: readFileSync(file),
    });
  });
};

const readWorld = async (page: Page, world: World): Promise<RecordedEvent[]> =>
  page.evaluate(
    (key) => JSON.parse(document.documentElement.dataset[key] || '[]'),
    datasetKey(world)
  );

const readBoth = async (page: Page) => ({
  main: await readWorld(page, 'main'),
  isolated: await readWorld(page, 'isolated'),
});

// Waits until both worlds received every event the phase expects, or until
// the timeout. Events recorded before `since` belong to earlier phases.
const waitForPhase = async (
  page: Page,
  phase: PhaseName,
  since: { main: number; isolated: number },
  timeoutMs: number
): Promise<PhaseRecord> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const all = await readBoth(page);
    const record: PhaseRecord = {
      phase,
      events: {
        main: all.main.slice(since.main),
        isolated: all.isolated.slice(since.isolated),
      },
    };
    if (evaluatePhase(record).length === 0 || Date.now() > deadline) {
      // Lets trailing events of the same burst land in this phase.
      await new Promise((r) => setTimeout(r, 1000));
      const settled = await readBoth(page);
      return {
        phase,
        events: {
          main: settled.main.slice(since.main),
          isolated: settled.isolated.slice(since.isolated),
        },
      };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
};

const lengths = async (page: Page) => {
  const all = await readBoth(page);
  return { main: all.main.length, isolated: all.isolated.length };
};

// Waits until no new event arrives for `quietMs`, so that late boot events
// (the unread count once the subscriptions load) do not land in the next phase.
const waitForQuiet = async (
  page: Page,
  timeoutMs: number,
  quietMs = 2000
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let last = JSON.stringify(await lengths(page));
  let quietSince = Date.now();
  while (Date.now() - quietSince < quietMs && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    const now = JSON.stringify(await lengths(page));
    if (now !== last) {
      last = now;
      quietSince = Date.now();
    }
  }
};

const readEnvironment = (page: Page) =>
  page.evaluate(() => {
    const info = (() => {
      if (typeof (window as any).require !== 'function') return 'no require';
      for (const path of ['/rocketchat.info', '/app/utils/rocketchat.info']) {
        try {
          const version = (window as any).require(path)?.Info?.version;
          if (version) return `${path} ${version}`;
        } catch {
          // Not at this path on this server version.
        }
      }
      return 'not resolvable';
    })();
    return {
      require: typeof (window as any).require,
      Meteor: typeof (window as any).Meteor,
      rocketchatInfo: info,
      processPlatform:
        typeof (window as any).process === 'undefined'
          ? 'no process'
          : String((window as any).process.platform),
    };
  });

type BuildReport = {
  build: Build;
  environment: Record<string, string>;
  phases: PhaseRecord[];
  failures: Failure[];
};

const probeBuild = async (
  build: Build,
  flags: Flags & { server: string },
  bundleDir: string | undefined
): Promise<BuildReport> => {
  const { call, login } = createRestClient(flags.server);
  const admin = await login(flags.user, flags.password);
  await call('users.create', {
    auth: admin,
    body: { ...SENDER, name: 'Web Signals Sender', verified: true },
    // A second run finds the sender already there; the login below checks it.
    allowFailure: true,
  });
  const sender = await login(SENDER.username, SENDER.password);

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const cdp = await page.createCDPSession();
    await cdp.send('Page.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: buildRecorderSource('main'),
    });
    // A separate world on the same page stands in for the desktop preload.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: buildRecorderSource('isolated'),
      worldName: 'web-signals-isolated',
    });
    if (build === 'vite' && bundleDir) {
      await serveViteBundle(page, flags.server, bundleDir);
    }

    const phases: PhaseRecord[] = [];
    const home = new URL('home', flags.server).href;

    await page.goto(home, { waitUntil: 'domcontentloaded' });
    phases.push(
      await waitForPhase(
        page,
        'logged-out boot',
        { main: 0, isolated: 0 },
        flags.timeoutMs
      )
    );

    await page.evaluate(({ token, uid }) => {
      localStorage.setItem('Meteor.loginToken', token);
      localStorage.setItem('Meteor.userId', uid);
      localStorage.setItem(
        'Meteor.loginTokenExpires',
        new Date(Date.now() + 86400000).toString()
      );
    }, admin);
    await page.reload({ waitUntil: 'domcontentloaded' });
    phases.push(
      await waitForPhase(
        page,
        'logged-in boot',
        { main: 0, isolated: 0 },
        flags.timeoutMs
      )
    );
    const environment = await readEnvironment(page);

    await waitForQuiet(page, flags.timeoutMs);
    // The unread count before the message: every event up to now.
    const beforeMessage = await readBoth(page);
    let since = {
      main: beforeMessage.main.length,
      isolated: beforeMessage.isolated.length,
    };
    const direct = await call('im.create', {
      auth: sender,
      body: { username: flags.user },
    });
    await call('chat.postMessage', {
      auth: sender,
      body: { roomId: direct.room?._id, text: `web signals ${Date.now()}` },
    });
    phases.push(
      await waitForPhase(page, 'incoming message', since, flags.timeoutMs)
    );

    since = await lengths(page);
    await call('users.setStatus', {
      auth: admin,
      body: { status: 'busy', message: 'web signals probe' },
    });
    phases.push(
      await waitForPhase(page, 'external status change', since, flags.timeoutMs)
    );

    since = await lengths(page);
    await call('users.logout', { auth: admin, body: { userId: admin.uid } });
    phases.push(
      await waitForPhase(page, 'forced logout', since, flags.timeoutMs)
    );

    const failures = [
      ...phases.flatMap(evaluatePhase),
      ...evaluateUnreadGrowth(beforeMessage, phases[2].events),
    ];
    return { build, environment, phases, failures };
  } finally {
    await browser.close();
    // Restore the status on every path. A user left `busy` makes the next
    // run's status change a no-op, which then fails with no event.
    try {
      const restored = await login(flags.user, flags.password);
      await call('users.setStatus', {
        auth: restored,
        body: { status: 'online', message: '' },
      });
    } catch (error) {
      console.warn(`Could not restore the status of ${flags.user}:`, error);
    }
  }
};

const printReport = (report: BuildReport): void => {
  console.log(`\n${report.build} build`);
  console.log(
    `  environment: ${Object.entries(report.environment)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')}`
  );
  for (const { phase, events } of report.phases) {
    const names = (world: World) =>
      [...new Set(events[world].map((event) => event.name))].join(', ') ||
      '(none)';
    console.log(`  ${phase}`);
    console.log(
      `    expected: ${PHASE_EXPECTATIONS[phase]
        .map(({ name }) => name)
        .join(', ')}`
    );
    console.log(`    main:     ${names('main')}`);
    console.log(`    isolated: ${names('isolated')}`);
  }
  if (report.failures.length === 0) {
    console.log('  PASS');
    return;
  }
  for (const failure of report.failures) {
    console.log(
      `  FAIL ${failure.phase} / ${failure.world} / ${failure.event}: ${failure.reason}`
    );
  }
};

const main = async (): Promise<void> => {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help || !flags.server) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }
  const server = flags.server.endsWith('/') ? flags.server : `${flags.server}/`;

  const bundleDir = flags.builds.includes('vite')
    ? flags.bundleDir ?? (await pullBundle(flags.bundleTag))
    : undefined;

  const reports: BuildReport[] = [];
  try {
    for (const build of flags.builds) {
      const report = await probeBuild(build, { ...flags, server }, bundleDir);
      printReport(report);
      reports.push(report);
    }
  } finally {
    if (bundleDir && !flags.bundleDir) {
      rmSync(dirname(bundleDir), { recursive: true, force: true });
    }
  }

  if (flags.out) {
    writeFileSync(flags.out, JSON.stringify(reports, null, 2));
    console.log(`\nReport written to ${flags.out}`);
  }

  if (reports.some((report) => report.failures.length > 0)) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
