// Runs the full user flow of the E2EE local search in a real browser (the web
// client of the server, browser backend: SQLite WASM worker + sealed OPFS copy).
//
//   node browser-flow.mjs --port <server port> --browser <path to firefox binary>
//     [--state-dir <harness state dir>] [--core-dir <Rocket.Chat checkout>]
//     [--out <output dir>] [--index-timeout-s 1200] [--keep-profile]
//
// Needs a server from `server.sh up` and a world from seed.mjs, seed-large.mjs
// and seed-rooms.mjs (the pt room has the needle "orçamento trimestral 2025").
// It reads user A, the rooms and the needle ids from the harness state file.
// It launches the browser (headless unless --headful) with a throwaway profile (puppeteer, WebDriver
// BiDi), never takes the focus, and deletes the profile at the end.
//
// Steps (one PASS/FAIL line each, then SUMMARY):
//   s1-login      log in as user A
//   s2-unlock     enter A's E2E password
//   s3-opt-in     turn on "Index my encrypted messages on this device"
//   s4-index      open the pt room's search panel, record progress until done
//   s5-search     search "orcamento" (no accent): decrypted hit with <mark>, click jumps to the message
//   s6-send       send a message with a unique word, search it
//   s6-edit       edit that message to a new word: new word found, old word gone
//   s6-delete     delete a message, search its word: gone
//   s7-reload     reload, search old history: the hit must come from the saved copy in OPFS. Every history response after
//                 the reload is recorded in the page; none that arrived up to the hit may hold the needle id
//   s8-mongo      the new message is e2e ciphertext in MongoDB
//   s8-opfs       the OPFS files are sealed (magic RCS1) and hold no test word
//   s9-console    console errors (info only, never fails)
// Exit code 0 only when every pass/fail step passes. Nothing secret is printed.
// Each step also logs its time (steps.mjs). A step that passes its limit (s4-index: --index-timeout-s) stops the run:
// the browser closes, the profile is deleted, and the exit code is not 0.

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { HISTORY_URL, HIT_MARGIN_MS, installPageHistoryRecorder, judgeSavedIndexHit, pageRecordingCoverage } from './restart-proof.mjs';
import { createSteps, isStepTimeout } from './steps.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({
	options: {
		'port': { type: 'string' },
		'browser': { type: 'string', default: '/Applications/Firefox.app/Contents/MacOS/firefox' },
		'state-dir': { type: 'string', default: process.env.HARNESS_STATE_DIR },
		'core-dir': { type: 'string', default: process.env.ROCKETCHAT_CORE_DIR },
		'desktop-dir': { type: 'string', default: process.env.DESKTOP_DIR ?? resolve(here, '..', '..') },
		'out': { type: 'string' },
		'index-timeout-s': { type: 'string', default: '1200' },
		'keep-profile': { type: 'boolean', default: false },
		// A visible window, so the storage.persist() prompt of the browser can be seen and captured (macOS screencapture).
		'headful': { type: 'boolean', default: false },
	},
});
const port = Number(values.port ?? process.env.HARNESS_PORT);
if (!port || !values['state-dir'] || !values['core-dir']) {
	console.error('usage: browser-flow.mjs --port <port> --browser <binary> --state-dir <dir> --core-dir <dir>');
	process.exit(2);
}
const base = `http://localhost:${port}`;
const out =
	values.out ??
	join(values['desktop-dir'], '.localdev/e2ee-search-harness/browser-runs', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(out, { recursive: true });
const indexTimeoutMs = Number(values['index-timeout-s']) * 1000;
const steps = createSteps({ script: 'browser-flow', params: { browser: basename(values.browser) }, runDir: out });

const state = JSON.parse(readFileSync(join(values['state-dir'], 'state.json'), 'utf8'));
const userA = state.users?.a;
const world = state.worlds?.[String(port)];
const pt = world?.rooms?.pt;
if (!userA?.e2ePassword || !world?.group || !pt?.needleId || !world.large?.needles) {
	console.error('browser-flow: the state file has no seeded world for this port: run seed.mjs, seed-large.mjs and seed-rooms.mjs');
	process.exit(2);
}
const largeOldest = Object.entries(world.large.needles)
	.map(([key, n]) => ({ key, ...n }))
	.find((n) => n.key === 'oldest') ?? Object.values(world.large.needles)[0];

const loadFrom = (dir, name) => createRequire(join(dir, 'package.json'))(name);
const puppeteer = loadFrom(values['desktop-dir'], 'puppeteer');
let mongodb;
try {
	mongodb = loadFrom(values['core-dir'], 'mongodb');
} catch {
	mongodb = loadFrom(join(values['core-dir'], 'apps', 'meteor'), 'mongodb');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const ts = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;
const log = (...m) => console.log(`[${ts()}]`, ...m);
const results = [];
const record = (step, ok, evidence) => {
	results.push({ step, ok, evidence });
	console.log(`${ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL'} ${step} ${JSON.stringify(evidence)}`);
	writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
};

const run = Math.random().toString(36).slice(2, 8);
const words = {
	sent: `ffsent${run}zulu`,
	edited: `ffedited${run}yankee`,
	deleted: `ffdeleted${run}xray`,
};

const consoleLines = [];
const requests = [];
// History responses as the browser network saw them, to check that the page recorder missed none.
const historyResponses = [];
let profileDir;
let browser;
let page;

const ev = (expr) => page.evaluate(expr);
const waitFor = async (expr, timeoutMs, everyMs = 250) => {
	const end = Date.now() + timeoutMs;
	while (Date.now() < end) {
		try {
			const v = await ev(expr);
			if (v) return v;
		} catch {
			// The page navigates.
		}
		await sleep(everyMs);
	}
	return undefined;
};
const navigate = (path) => ev(`(() => { history.pushState({}, '', ${JSON.stringify(path)}); dispatchEvent(new PopStateEvent('popstate')); return true; })()`);
const progress = () =>
	ev(`(() => { try { return window.require('/client/lib/e2ee/rocketchat.e2e.ts').e2eSearchIndexRuntime.getProgress() ?? null; } catch (e) { return { error: String(e) }; } })()`);
const panelSel = `document.querySelector('input[name=searchText]')`;
const panelExpr = `${panelSel}?.closest('aside, [role=dialog], .rcx-vertical-bar')`;

const shot = async (name, expr) => {
	const file = join(out, `${name}.png`);
	try {
		if (expr) {
			const handle = await page.evaluateHandle(expr);
			const el = handle.asElement();
			if (el) {
				await el.screenshot({ path: file });
				return file;
			}
		}
		await page.screenshot({ path: file });
		return file;
	} catch (error) {
		return `screenshot failed: ${error.message}`;
	}
};

// Types `text` into the search panel and waits for hits that contain `expect`, or for "No results".
const panelSearch = async (text, { expectWord, expectId, timeoutMs = 20000 } = {}) => {
	await ev(`(() => { const i = ${panelSel}; i.focus(); i.select(); return true; })()`);
	await page.keyboard.press('Backspace');
	const started = Date.now();
	await page.type('input[name=searchText]', text);
	const typedAt = Date.now();
	// The panel keeps the result of a shorter prefix for a moment while typing, so "No results" counts only when it stays
	// for EMPTY_SETTLE_MS after the last key. Hits with the expected word count at once.
	const EMPTY_SETTLE_MS = 3000;
	const state = await waitFor(
		`(() => {
			const settled = Date.now() - ${typedAt} > ${EMPTY_SETTLE_MS};
			const input = ${panelSel};
			if (!input || input.value !== ${JSON.stringify(text)}) return undefined;
			const panel = ${panelExpr};
			const hits = [...panel.querySelectorAll('[data-qa=local-message-search-hit]')].map((h) => ({
				text: h.innerText.replace(/\\s+/g, ' ').slice(0, 200),
				marks: [...h.querySelectorAll('mark')].map((m) => m.textContent),
			}));
			const empty = /No results found/i.test(panel.innerText);
			const want = ${JSON.stringify((expectWord ?? '').toLowerCase())};
			if (want && hits.some((h) => h.text.toLowerCase().includes(want))) return { hits, empty };
			if (empty && settled) return { hits: [], empty };
			if (!want && settled && hits.length) return { hits, empty };
			return undefined;
		})()`,
		timeoutMs,
		100,
	);
	return { ...(state ?? { hits: [], empty: false, timedOut: true }), latencyMs: Date.now() - typedAt, totalMs: Date.now() - started };
};

const openPanel = async (roomName) => {
	await navigate(`/group/${roomName}`);
	await waitFor(`!!document.querySelector('textarea[name=msg]') || !!document.querySelector('[data-qa=room-header], header')`, 60000);
	await navigate(`/group/${roomName}/rocket-search`);
	return Boolean(await waitFor(`!!${panelSel}`, 60000));
};

const cleanup = async () => {
	try {
		await browser?.close();
	} catch {
		// Already gone.
	}
	if (profileDir && !values['keep-profile']) rmSync(profileDir, { recursive: true, force: true });
};

let finishing;
const finish = () => (finishing ??= finishRun());
const finishRun = async () => {
	record('s9-console', null, {
		errors: consoleLines.filter((l) => l.type === 'error').slice(0, 30),
		warnings: consoleLines.filter((l) => l.type === 'warn' && /e2ee|search|index|persist|storage/i.test(l.text)).slice(0, 20),
		e2eeSearchInfo: consoleLines.filter((l) => /E2EE search index/i.test(l.text)).map((l) => `${l.at} ${l.type} ${l.text}`).slice(0, 20),
	});
	writeFileSync(join(out, 'console.json'), JSON.stringify(consoleLines, null, 2));
	await cleanup();
	const failed = results.filter((r) => r.ok === false);
	console.log(`SUMMARY ${failed.length ? 'FAIL' : 'PASS'} ${results.filter((r) => r.ok).length} passed, ${failed.length} failed${failed.length ? ` (${failed.map((r) => r.step).join(', ')})` : ''} out ${out}`);
	process.exit(failed.length ? 1 : 0);
};

process.on('SIGINT', () => void cleanup().then(() => process.exit(130)));
steps.onAbort(async () => {
	record('runner', false, { error: 'a step passed its limit: see the STEP FAIL line' });
	await finish();
});

try {
	// ---------------------------------------------------------------- launch
	let st = steps.start('launch', { expectedS: 10, limitS: 180 });
	profileDir = mkdtempSync(join(out, 'ff-profile-'));
	browser = await puppeteer.launch({
		browser: 'firefox',
		executablePath: values.browser,
		headless: !values.headful,
		userDataDir: profileDir,
		protocolTimeout: 180000,
		extraPrefsFirefox: {
			'browser.shell.checkDefaultBrowser': false,
			'app.update.enabled': false,
			'datareporting.policy.dataSubmissionEnabled': false,
			'toolkit.telemetry.reportingpolicy.firstRun': false,
			'browser.aboutwelcome.enabled': false,
			// The selectors match the English UI.
			'intl.accept_languages': 'en-US, en',
			'intl.locale.requested': 'en-US',
			'privacy.spoof_english': 2,
		},
	});
	const version = await browser.version();
	log(`browser ${version}, profile ${profileDir}`);
	page = (await browser.pages())[0] ?? (await browser.newPage());
	await page.setViewport({ width: 1440, height: 900 });
	page.on('console', (m) => consoleLines.push({ at: ts(), type: m.type(), text: m.text().slice(0, 500) }));
	page.on('pageerror', (e) => consoleLines.push({ at: ts(), type: 'error', text: `pageerror: ${String(e?.message ?? e).slice(0, 500)}` }));
	page.on('request', (r) => {
		const url = r.url();
		if (/syncMessages|loadHistory|loadSurroundingMessages|chat\.getMessage|e2ee-search/.test(url)) requests.push({ at: Date.now(), url: url.replace(base, '').slice(0, 160) });
	});
	page.on('response', (r) => {
		if (HISTORY_URL.test(r.url())) historyResponses.push({ at: Date.now(), url: r.url() });
	});
	// WebDriver BiDi cannot read response bodies, so the page records each history response with its body
	// (window.__e2eeHarnessHistory), from before the first script of each document. See restart-proof.mjs.
	await page.evaluateOnNewDocument(installPageHistoryRecorder, HISTORY_URL.source);
	st.end(true);

	// ---------------------------------------------------------------- s1 login
	// The limits of the steps cover the waits of each step one after the other.
	st = steps.start('s1-login', { expectedS: 15, limitS: 480 });
	await page.goto(`${base}/home`, { waitUntil: 'domcontentloaded', timeout: 180000 });
	const form = await waitFor(`!!document.querySelector('input[name=usernameOrEmail]')`, 180000);
	if (form) {
		await page.type('input[name=usernameOrEmail]', userA.username);
		await page.type('input[name=password]', userA.password);
		await ev(`document.querySelector('form').requestSubmit()`);
	}
	const uid = await waitFor(`localStorage.getItem('Meteor.userId')`, 90000);
	record('s1-login', Boolean(uid), { form: Boolean(form), loggedIn: Boolean(uid), ua: await ev('navigator.userAgent') });
	st.end(Boolean(uid));
	if (!uid) await finish();

	// ---------------------------------------------------------------- s2 unlock
	const unlock = async () => {
		const end = Date.now() + 120000;
		let typed = false;
		while (Date.now() < end) {
			if (await ev(`!!localStorage.getItem('private_key')`)) return { ok: true, typed };
			if (await ev(`!!document.querySelector('.rcx-modal input[name=password]')`)) {
				await ev(`(() => { const i = document.querySelector('.rcx-modal input[name=password]'); i.focus(); i.select(); return true; })()`);
				await page.keyboard.press('Backspace');
				await page.type('.rcx-modal input[name=password]', userA.e2ePassword);
				await ev(`[...document.querySelectorAll('.rcx-modal button')].find((b) => /Enable encryption/i.test(b.innerText))?.click()`);
				typed = true;
				await waitFor(`!!localStorage.getItem('private_key')`, 20000);
				continue;
			}
			await ev(`[...document.querySelectorAll('.rcx-banner')].find((b) => /E2E/.test(b.innerText))?.querySelector('.rcx-banner__content')?.click()`);
			await sleep(2000);
		}
		return { ok: false, typed };
	};
	st = steps.start('s2-unlock', { expectedS: 10, limitS: 180 });
	const unlocked = await unlock();
	record('s2-unlock', unlocked.ok, unlocked);
	st.end(unlocked.ok);
	if (!unlocked.ok) {
		await shot('s2-unlock-failure');
		await finish();
	}

	// ---------------------------------------------------------------- s3 opt-in
	st = steps.start('s3-opt-in', { expectedS: 5, limitS: 120 });
	const optKey = `E2EESearch_OptIn_${uid}`;
	await navigate('/account/security');
	const toggle = `document.getElementById([...document.querySelectorAll('label[for]')].find((l) => /Index my encrypted messages/i.test(l.innerText))?.htmlFor ?? '')`;
	const toggleShown = Boolean(await waitFor(`!!(${toggle})`, 60000));
	if (toggleShown) {
		await shot('s3-account-security');
		const handle = await page.evaluateHandle(`(${toggle}).closest('label') ?? (${toggle})`);
		await handle.asElement().click();
	}
	const optedIn = Boolean(await waitFor(`localStorage.getItem(${JSON.stringify(optKey)}) === 'true'`, 10000));
	record('s3-opt-in', optedIn, { toggleShown, optedIn });
	st.end(optedIn);
	if (!optedIn) {
		await shot('s3-opt-in-failure');
		await finish();
	}

	// ---------------------------------------------------------------- s4 index
	st = steps.start('s4-panel', { expectedS: 10, limitS: 180 });
	const panelOpen = await openPanel(pt.name);

	// The index asks navigator.storage.persist() once it opens. Record what the browser does with it.
	await sleep(4000);
	const persist = await ev(`(async () => ({
		permission: await navigator.permissions.query({ name: 'persistent-storage' }).then((s) => s.state, (e) => 'query failed: ' + e),
		persisted: await navigator.storage.persisted?.(),
	}))()`).catch((e) => ({ error: String(e) }));
	persist.consoleLines = consoleLines.filter((l) => /persistent storage|persist/i.test(l.text)).map((l) => `${l.at} ${l.text}`);
	persist.headless = !values.headful;
	if (values.headful) {
		const { execFileSync } = await import('node:child_process');
		const ffPid = browser.process()?.pid;
		const pids = [ffPid];
		try {
			pids.push(...execFileSync('/usr/bin/pgrep', ['-P', String(ffPid)]).toString().trim().split('\n'));
		} catch {
			// No children.
		}
		// winid.swift lists the window ids of the browser, so screencapture can grab the prompt window only.
		const winidBin = join(out, 'winid');
		try {
			execFileSync('/usr/bin/swiftc', ['-O', '-o', winidBin, join(here, 'winid.swift')], { stdio: 'ignore' });
		} catch {
			// No Swift toolchain: no window screenshots.
		}
		const windows = existsSync(winidBin)
			? execFileSync(winidBin, pids.map(String)).toString().trim().split('\n').filter(Boolean).map((l) => l.split(' '))
			: [];
		persist.windows = windows.map((w) => w.join(' '));
		persist.windowShots = [];
		for (const w of windows) {
			const file = join(out, `s4-persist-prompt-window-${w[0]}-layer${w[2]}.png`);
			try {
				execFileSync('/usr/sbin/screencapture', ['-x', '-o', '-l', w[0], file]);
				persist.windowShots.push(file);
			} catch (error) {
				persist.windowShots.push(`screencapture ${w[0]} failed: ${error.message}`);
			}
		}
	}
	record('s4-persist-prompt', null, persist);
	st.end(true);

	// --index-timeout-s is the default limit of this step. The limit ends the loop and the run.
	st = steps.start('s4-index', {
		expectedS: 120,
		limitS: indexTimeoutMs / 1000,
		params: { pause: process.env.HARNESS_BACKFILL_PAUSE_S || 1 },
	});
	const transitions = [];
	let last = '';
	let firstShot;
	const indexStart = Date.now();
	let p;
	let panelText = '';
	while (!st.signal.aborted) {
		p = await progress();
		panelText = (await ev(`document.querySelector('[data-qa=local-search-index-progress]')?.innerText.replace(/\\s+/g, ' ') ?? ''`)) || '';
		const key = `${p?.status}|${p?.roomsDone}/${p?.rooms}|${panelText}`;
		if (key !== last) {
			transitions.push({ t: Math.round((Date.now() - indexStart) / 1000), ...p, panel: panelText });
			last = key;
			if (!firstShot && panelText) firstShot = await shot('s4-panel-indexing', panelExpr);
		}
		if (p?.status === 'done') break;
		await sleep(2000);
	}
	const indexMs = Date.now() - indexStart;
	const doneShot = await shot('s4-panel-done', panelExpr);
	writeFileSync(join(out, 'index-transitions.json'), JSON.stringify(transitions, null, 2));
	record('s4-index', p?.status === 'done', {
		panelOpen,
		indexSeconds: Math.round(indexMs / 1000),
		final: p,
		transitions: transitions.length,
		firstPanelText: transitions.find((x) => x.panel)?.panel,
		syncRequests: requests.filter((r) => r.at >= indexStart).length,
		screenshots: [firstShot, doneShot].filter(Boolean),
	});
	st.end(p?.status === 'done');
	// Past the limit, the abort handler finishes the run: stop here.
	st.signal.throwIfAborted();

	// ---------------------------------------------------------------- s5 search + jump
	st = steps.start('s5-search', { expectedS: 10, limitS: 120 });
	const s5 = await panelSearch('orcamento', { expectWord: 'orçamento' });
	const s5shot = await shot('s5-panel-orcamento', panelExpr);
	const markOk = s5.hits.some((h) => h.marks.some((m) => m.toLowerCase().normalize('NFC') === 'orçamento'));
	// Click the oldest hit shown (the last one), so the jump must load history around it. The hit carries no id in the
	// DOM: the id comes from the ?msg= parameter that the click sets.
	const clickTarget = await page.evaluateHandle(
		`[...(${panelExpr}).querySelectorAll('[data-qa=local-message-search-hit]')].filter((h) => /orçamento/i.test(h.innerText)).pop()`,
	);
	let jump = { clicked: false };
	if (clickTarget.asElement()) {
		jump.hitText = await clickTarget.asElement().evaluate((h) => h.innerText.replace(/\s+/g, ' ').slice(0, 120));
		await clickTarget.asElement().click();
		jump.clicked = true;
		const msgId = await waitFor(`new URLSearchParams(location.search).get('msg')`, 5000);
		jump.urlHasMsg = Boolean(msgId);
		jump.inView = msgId
			? await waitFor(
					`(() => {
						const el = document.querySelector('[data-id=${JSON.stringify(String(msgId))}]');
						if (!el) return undefined;
						const r = el.getBoundingClientRect();
						return r.bottom > 0 && r.top < innerHeight ? { text: el.innerText.replace(/\\s+/g, ' ').slice(0, 120) } : undefined;
					})()`,
					20000,
				)
			: undefined;
		jump.shot = await shot('s5-after-jump');
	}
	record('s5-search', s5.hits.length > 0 && markOk && Boolean(jump.inView), {
		hits: s5.hits.length,
		marks: [...new Set(s5.hits.flatMap((h) => h.marks))],
		latencyMs: s5.latencyMs,
		jump: { ...jump, inView: Boolean(jump.inView), decryptedText: jump.inView?.text?.includes('orçamento') ?? false },
		screenshot: s5shot,
	});
	st.end(s5.hits.length > 0 && markOk && Boolean(jump.inView));

	// ---------------------------------------------------------------- s6 send / edit / delete
	st = steps.start('s6-send', { expectedS: 15, limitS: 300 });
	await navigate(`/group/${pt.name}`);
	await waitFor(`!!document.querySelector('textarea[name=msg]')`, 30000);
	const sendText = async (text) => {
		await page.click('textarea[name=msg]');
		await page.type('textarea[name=msg]', text);
		await page.keyboard.press('Enter');
		return waitFor(
			`(() => { const el = [...document.querySelectorAll('[data-id]')].reverse().find((m) => m.innerText.includes(${JSON.stringify(text)})); return el?.dataset.id; })()`,
			30000,
		);
	};
	const sentId = await sendText(`teste da busca ${words.sent} no firefox`);
	await sleep(2500);
	await openPanel(pt.name);
	const s6a = await panelSearch(words.sent, { expectWord: words.sent });
	record('s6-send', Boolean(sentId) && s6a.hits.length === 1, { sentId: Boolean(sentId), hits: s6a.hits.length, latencyMs: s6a.latencyMs, empty: s6a.empty });
	st.end(Boolean(sentId) && s6a.hits.length === 1);

	// Edit: ArrowUp in the empty composer edits the last own message.
	st = steps.start('s6-edit', { expectedS: 20, limitS: 300 });
	await navigate(`/group/${pt.name}`);
	await waitFor(`!!document.querySelector('textarea[name=msg]')`, 30000);
	await page.click('textarea[name=msg]');
	await page.keyboard.press('ArrowUp');
	const editing = Boolean(await waitFor(`document.querySelector('textarea[name=msg]').value.includes(${JSON.stringify(words.sent)})`, 5000));
	if (editing) {
		await ev(`document.querySelector('textarea[name=msg]').select()`);
		await page.keyboard.press('Backspace');
		await page.type('textarea[name=msg]', `teste editado ${words.edited} no firefox`);
		await page.keyboard.press('Enter');
	}
	const edited = Boolean(
		await waitFor(`document.querySelector('[data-id=${JSON.stringify(sentId ?? '')}]')?.innerText.includes(${JSON.stringify(words.edited)})`, 20000),
	);
	await sleep(2500);
	await openPanel(pt.name);
	const s6new = await panelSearch(words.edited, { expectWord: words.edited });
	const s6old = await panelSearch(words.sent, { expectWord: words.sent });
	record('s6-edit', edited && s6new.hits.length === 1 && s6old.empty && s6old.hits.length === 0, {
		editModeOpened: editing,
		editedInRoom: edited,
		newWordHits: s6new.hits.length,
		oldWordHits: s6old.hits.length,
		oldWordNoResults: s6old.empty,
	});
	st.end(edited && s6new.hits.length === 1 && s6old.empty && s6old.hits.length === 0);

	// Delete: a second own message, removed with the message menu (fallback: REST chat.delete).
	st = steps.start('s6-delete', { expectedS: 25, limitS: 360 });
	await navigate(`/group/${pt.name}`);
	await waitFor(`!!document.querySelector('textarea[name=msg]')`, 30000);
	const delId = await sendText(`apagar ${words.deleted} depois`);
	await sleep(2500);
	await openPanel(pt.name);
	const s6pre = await panelSearch(words.deleted, { expectWord: words.deleted });
	await navigate(`/group/${pt.name}`);
	let deleteMode = 'ui';
	const msgSel = `[data-id=${JSON.stringify(delId ?? '')}]`;
	try {
		await page.hover(msgSel);
		await sleep(500);
		const more = await page.evaluateHandle(`document.querySelector(${JSON.stringify(msgSel)})?.querySelector('[data-qa-id=menu], button[title="More"], button[aria-label="More"]')`);
		if (!more.asElement()) throw new Error('no message menu button');
		await more.asElement().click();
		const del = await waitFor(`!!([...document.querySelectorAll('[role=option], [role=menuitem], li')].find((o) => /^\\s*Delete\\s*$/im.test(o.innerText)))`, 5000);
		if (!del) {
			await shot('s6-delete-menu');
			throw new Error('no Delete item');
		}
		const item = await page.evaluateHandle(`[...document.querySelectorAll('[role=option], [role=menuitem], li')].find((o) => /^\\s*Delete\\s*$/im.test(o.innerText))`);
		await item.asElement().click();
		const confirm = await waitFor(`!!([...document.querySelectorAll('.rcx-modal button')].find((b) => /Yes, delete|Delete/i.test(b.innerText)))`, 5000);
		if (!confirm) throw new Error('no confirm dialog');
		const btn = await page.evaluateHandle(`[...document.querySelectorAll('.rcx-modal button')].find((b) => /Yes, delete|Delete/i.test(b.innerText))`);
		await btn.asElement().click();
	} catch (error) {
		deleteMode = `rest (ui failed: ${error.message})`;
		await ev(`fetch('/api/v1/chat.delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('Meteor.userId'), 'X-Auth-Token': localStorage.getItem('Meteor.loginToken') }, body: JSON.stringify({ roomId: ${JSON.stringify(pt.rid)}, msgId: ${JSON.stringify(delId ?? '')} }) }).then((r) => r.json())`);
	}
	const goneFromRoom = Boolean(await waitFor(`!document.querySelector(${JSON.stringify(msgSel)})`, 15000));
	await sleep(2500);
	await openPanel(pt.name);
	const s6del = await panelSearch(words.deleted, { expectWord: words.deleted });
	record('s6-delete', s6pre.hits.length === 1 && goneFromRoom && s6del.empty && s6del.hits.length === 0, {
		deleteMode,
		hitsBefore: s6pre.hits.length,
		goneFromRoom,
		hitsAfter: s6del.hits.length,
		noResultsAfter: s6del.empty,
	});
	await shot('s6-panel-after-delete', panelExpr);
	st.end(s6pre.hits.length === 1 && goneFromRoom && s6del.empty && s6del.hits.length === 0);

	// ---------------------------------------------------------------- s7 reload
	st = steps.start('s7-reload', { expectedS: 30, limitS: 660 });
	const opfsBefore = await ev(`(async () => {
		const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('e2ee-search');
		const files = [];
		for await (const [name, h] of dir.entries()) if (h.kind === 'file') { const f = await h.getFile(); files.push({ name: name.slice(0, 12), size: f.size, lastModified: f.lastModified }); }
		return files;
	})()`).catch((e) => ({ error: String(e) }));
	await sleep(3000); // let the 1 s save timer write the last change
	const reloadAt = Date.now();
	await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
	const reUnlock = await unlock();
	const panelAgain = await openPanel(world.group.name);
	const openedAt = Date.now();
	const pAfter = await progress();
	const s7old = await panelSearch(largeOldest.word, { expectWord: largeOldest.word, timeoutMs: 40000 });
	const searchedAt = Date.now();
	const pAfterSearch = await progress();
	const syncSinceReload = requests.filter((r) => r.at >= reloadAt && /syncMessages/.test(r.url)).length;
	// The proof: no history response that arrived after the reload and up to the hit holds the id of the needle.
	// Wait for the responses of the margin, and for every body read in the page to end.
	await sleep(HIT_MARGIN_MS);
	await waitFor(`window.__e2eeHarnessHistory?.every((r) => r.noResponse || r.at === undefined || r.body !== undefined || r.error !== undefined)`, 15000);
	const recorded = (await ev(`window.__e2eeHarnessHistory?.map((r) => ({ ...r })) ?? null`).catch(() => null)) ?? [];
	const recorderInstalled = Boolean(await ev(`Array.isArray(window.__e2eeHarnessHistory)`).catch(() => false));
	const until = searchedAt + HIT_MARGIN_MS;
	const coverage = recorderInstalled
		? pageRecordingCoverage({ network: historyResponses.filter((r) => r.at >= reloadAt), recorded, until })
		: { ok: false, reason: 'the page recorder is not installed in the reloaded page' };
	const savedIndex = judgeSavedIndexHit({
		needleId: largeOldest.id,
		hit: s7old.hits.some((h) => h.text.toLowerCase().includes(largeOldest.word.toLowerCase())),
		hitAt: searchedAt,
		responses: recorded,
		coverage,
	});
	await openPanel(pt.name);
	const s7edit = await panelSearch(words.edited, { expectWord: words.edited });
	const s7shot = await shot('s7-panel-after-reload', panelExpr);
	const restoredInfo = consoleLines.filter((l) => /saved copy is gone|could not be opened|memory only/i.test(l.text));
	record(
		's7-reload',
		reUnlock.ok && panelAgain && s7old.hits.length > 0 && s7edit.hits.length === 1 && savedIndex.ok && restoredInfo.length === 0,
		{
			reUnlock,
			opfsBefore,
			oldNeedleHits: s7old.hits.length,
			editedWordHits: s7edit.hits.length,
			secondsReloadToHit: Math.round((searchedAt - reloadAt) / 1000),
			secondsReloadToPanel: Math.round((openedAt - reloadAt) / 1000),
			latencyMs: s7old.latencyMs,
			progressAtOpen: pAfter,
			progressAtSearch: pAfterSearch,
			syncMessagesSinceReload: syncSinceReload,
			savedIndex,
			evictionOrMemoryOnlyLines: restoredInfo.map((l) => l.text),
			screenshot: s7shot,
		},
	);
	st.end(reUnlock.ok && panelAgain && s7old.hits.length > 0 && s7edit.hits.length === 1 && savedIndex.ok && restoredInfo.length === 0);

	// ---------------------------------------------------------------- s8 at rest
	st = steps.start('s8-mongo', { expectedS: 2, limitS: 120 });
	const client = await mongodb.MongoClient.connect(`mongodb://127.0.0.1:${port + 1}/?directConnection=true`);
	try {
		const msgs = client.db('meteor').collection('rocketchat_message');
		const doc = sentId ? await msgs.findOne({ _id: sentId }) : null;
		const json = JSON.stringify(doc ?? {});
		const needle = await msgs.findOne({ _id: pt.needleId });
		const anyPlain = await msgs.countDocuments({ rid: pt.rid, $or: Object.values(words).map((w) => ({ msg: { $regex: w } })) });
		record('s8-mongo', Boolean(doc) && doc.t === 'e2e' && !Object.values(words).some((w) => json.includes(w)) && needle?.t === 'e2e' && anyPlain === 0, {
			sentDoc: doc ? { t: doc.t, msgPrefix: String(doc.msg ?? '').slice(0, 14), hasContent: Boolean(doc.content), edited: Boolean(doc.editedAt) } : null,
			ptNeedle: needle ? { t: needle.t, plaintextOrcamento: JSON.stringify(needle).includes('orçamento') } : null,
			plaintextHitsInRoom: anyPlain,
		});
	} finally {
		await client.close();
	}
	st.end(results.at(-1)?.step === 's8-mongo' && results.at(-1).ok);

	st = steps.start('s8-opfs', { expectedS: 5, limitS: 180 });
	const scanWords = [...Object.values(words), 'orçamento', 'orcamento', 'trimestral', largeOldest.word];
	const opfs = await ev(`(async () => {
		const enc = new TextEncoder();
		const words = ${JSON.stringify(scanWords)};
		const find = (hay, needle) => { outer: for (let i = 0; i <= hay.length - needle.length; i++) { for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer; return true; } return false; };
		const root = await navigator.storage.getDirectory();
		const files = [];
		const walk = async (dir, prefix) => {
			for await (const [name, h] of dir.entries()) {
				if (h.kind === 'directory') { await walk(h, prefix + name + '/'); continue; }
				const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer());
				const hits = words.filter((w) => find(bytes, enc.encode(w)));
				files.push({ path: prefix + name.slice(0, 12) + (name.length > 12 ? '…' : ''), size: bytes.length, magic: String.fromCharCode(...bytes.slice(0, 4)), sqliteHeader: find(bytes.slice(0, 64), enc.encode('SQLite format')), hits });
			}
		};
		await walk(root, '');
		const persisted = await navigator.storage.persisted?.();
		return { files, persisted };
	})()`);
	const sealedFiles = opfs.files.filter((f) => f.path.startsWith('e2ee-search/'));
	record('s8-opfs', sealedFiles.length > 0 && sealedFiles.every((f) => f.magic === 'RCS1' && !f.sqliteHeader) && opfs.files.every((f) => f.hits.length === 0), opfs);
	st.end(results.at(-1).ok);

	// Info: a scan of the Firefox profile on disk (other stores of the web client too).
	st = steps.start('s8-profile-scan', { expectedS: 10, limitS: 300 });
	const diskHits = [];
	const walkDisk = (dir) => {
		for (const name of readdirSync(dir)) {
			const p = join(dir, name);
			const st = statSync(p);
			if (st.isDirectory()) walkDisk(p);
			else if (st.size < 200 * 1024 * 1024) {
				const buf = readFileSync(p);
				const hits = scanWords.filter((w) => buf.includes(Buffer.from(w, 'utf8')) || buf.includes(Buffer.from(w, 'utf16le')));
				if (hits.length) diskHits.push({ file: p.replace(profileDir, '<profile>'), hits });
			}
		}
	};
	walkDisk(profileDir);
	record('s8-profile-scan', null, { note: 'info only: compressed stores can hide words', filesWithHits: diskHits });
	st.end(true);
} catch (error) {
	steps.failActive(String(error?.message ?? error).split('\n')[0].slice(0, 200));
	// After a step timeout, the abort handler records the failure and finishes the run.
	if (!finishing && !isStepTimeout(error)) {
		record('runner', false, { error: String(error?.stack ?? error).slice(0, 1500) });
		if (page) await shot('runner-failure');
	}
}
await finish();
