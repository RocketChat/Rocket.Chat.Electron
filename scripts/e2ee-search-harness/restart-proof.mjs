// Proves that a search hit after a restart or a reload came from the index
// that was saved on disk, and not from history that the web client fetched
// again in this run.
//
// The web client fills the index only from messages that it gets from the
// server. After a restart, a hit for an old needle comes from the saved index
// or from a server response of this run that holds the needle. The harness
// records every history response of the run, from the first request of the
// page on. The check passes only when the hit is there and no recorded
// response that arrived up to the hit holds the id of the needle message. The
// pace of the crawler does not change the result.
//
// The check fails when it cannot read a response body, and when the
// recording can have missed a response (the coverage). It never passes on
// missing data.
//
//   node restart-proof.mjs --self-test   runs the decision on sample data

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sleep } from './cdp.mjs';

// The requests that can bring old messages to the web client.
export const HISTORY_URL =
  /chat\.syncMessages|loadHistory|loadSurroundingMessages|loadNextMessages|chat\.getMessage/;

// Events of two connections can arrive in a different order. Every response
// that arrived up to this long after the hit counts as before the hit. A
// larger margin makes the check stricter, never weaker.
export const HIT_MARGIN_MS = 2000;

const pathOf = (url) => {
  try {
    const { pathname, search } = new URL(url);
    return `${pathname}${search}`.slice(0, 160);
  } catch {
    return String(url).slice(0, 160);
  }
};

// The decision. Each response is { url, at, body, error, noResponse }:
//   at          the time (ms since the epoch) when the response arrived.
//               A response without `at` counts as before the hit.
//   body        the response text. Not a string: the body was not read.
//   noResponse  true when the request failed before any response. The page
//               got no data from it, so it does not count.
// Each frame is { at, data }, a WebSocket message from the server.
// coverage is { ok, reason }: ok only when the recorder saw the run from its
// first request.
export const judgeSavedIndexHit = ({
  needleId,
  hit,
  hitAt,
  responses = [],
  frames = [],
  coverage,
  marginMs = HIT_MARGIN_MS,
}) => {
  const reasons = [];
  if (typeof needleId !== 'string' || needleId.length === 0)
    reasons.push('no needle id');
  if (hit !== true) reasons.push('the search did not return the needle');
  if (!Number.isFinite(hitAt)) reasons.push('no time of the hit');
  if (coverage?.ok !== true)
    reasons.push(
      `the recording can have missed a response: ${coverage?.reason ?? 'no coverage data'}`
    );
  const until = Number.isFinite(hitAt) ? hitAt + marginMs : Infinity;
  const beforeHit = (item) => !(item.at > until);
  const counted = responses.filter(
    (r) => r.noResponse !== true && HISTORY_URL.test(r.url) && beforeHit(r)
  );
  const unreadable = counted.filter((r) => typeof r.body !== 'string');
  const withNeedle = counted.filter(
    (r) => typeof r.body === 'string' && needleId && r.body.includes(needleId)
  );
  const framesWithNeedle = frames.filter(
    (f) =>
      beforeHit(f) &&
      typeof f.data === 'string' &&
      needleId &&
      f.data.includes(needleId)
  );
  if (unreadable.length)
    reasons.push(
      `${unreadable.length} history response(s) without a readable body: ${unreadable
        .slice(0, 3)
        .map((r) => `${pathOf(r.url)} (${r.error ?? 'no body'})`)
        .join(', ')}`
    );
  if (withNeedle.length)
    reasons.push(
      `${withNeedle.length} history response(s) before the hit hold the needle id: ${withNeedle
        .slice(0, 3)
        .map((r) => pathOf(r.url))
        .join(', ')}`
    );
  if (framesWithNeedle.length)
    reasons.push(
      `${framesWithNeedle.length} WebSocket frame(s) before the hit hold the needle id`
    );
  return {
    ok: reasons.length === 0,
    reasons,
    historyResponses: counted.length,
    syncMessages: counted.filter((r) => /chat\.syncMessages/.test(r.url))
      .length,
    responsesWithNeedle: withNeedle.length,
    framesChecked: frames.filter(beforeHit).length,
    framesWithNeedle: framesWithNeedle.length,
  };
};

// The browser test records in the page (WebDriver BiDi cannot read response
// bodies). It compares that recording with the network events of the
// browser: each history response that the network saw up to `until` must have
// a recorded twin with the same URL. A response that the page recorder missed
// makes the coverage fail.
export const pageRecordingCoverage = ({ network, recorded, until }) => {
  const left = new Map();
  for (const r of recorded) {
    const key = pathOf(r.url);
    left.set(key, (left.get(key) ?? 0) + 1);
  }
  const missed = [];
  for (const n of network) {
    if (!HISTORY_URL.test(n.url) || n.at > until) continue;
    const key = pathOf(n.url);
    const count = left.get(key) ?? 0;
    if (count > 0) left.set(key, count - 1);
    else missed.push(key);
  }
  return missed.length
    ? {
        ok: false,
        reason: `the page recorder missed ${missed.length} history response(s) that the network saw: ${missed.slice(0, 3).join(', ')}`,
      }
    : { ok: true };
};

// Runs in the page before any script of the page (puppeteer
// evaluateOnNewDocument). It wraps fetch and XMLHttpRequest and keeps each
// history response in window.__e2eeHarnessHistory. The bodies stay in the
// page.
export function installPageHistoryRecorder(pattern) {
  const history = new RegExp(pattern);
  const records = [];
  Object.defineProperty(window, '__e2eeHarnessHistory', { value: records });
  const absolute = (url) => {
    try {
      return new URL(String(url), location.href).href;
    } catch {
      return undefined;
    }
  };

  const realFetch = window.fetch;
  window.fetch = function fetch(input, init) {
    const promise = realFetch.apply(window, arguments);
    const url = absolute(input instanceof Request ? input.url : input);
    if (!url || !history.test(url)) return promise;
    const record = { url };
    records.push(record);
    promise.then(
      (response) => {
        record.at = Date.now();
        record.status = response.status;
        response
          .clone()
          .text()
          .then(
            (body) => {
              record.body = body;
            },
            (error) => {
              record.error = String(error);
            }
          );
      },
      (error) => {
        record.noResponse = true;
        record.error = String(error);
      }
    );
    return promise;
  };

  const { open, send } = XMLHttpRequest.prototype;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__e2eeHarnessUrl = absolute(url);
    return open.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    const url = this.__e2eeHarnessUrl;
    if (url && history.test(url)) {
      const record = { url };
      records.push(record);
      this.addEventListener('loadend', () => {
        if (this.status === 0) {
          record.noResponse = true;
          return;
        }
        record.at = Date.now();
        record.status = this.status;
        try {
          if (this.responseType === '' || this.responseType === 'text')
            record.body = this.responseText;
          else if (this.responseType === 'json')
            record.body = JSON.stringify(this.response);
          else record.error = `responseType ${this.responseType}`;
        } catch (error) {
          record.error = String(error);
        }
      });
    }
    return send.apply(this, args);
  };
}

const errorText = (error) => String(error?.message ?? error);

// The desktop test records with CDP. It connects to the browser endpoint of
// the app as early as it can, and turns on auto-attach with
// waitForDebuggerOnStart. Each new target (also the server webview) then
// waits until the recorder has turned on the Network domain for it. So the
// recorder sees the first request of the page.
//
// Start it before the app starts. It polls the CDP port until the app opens
// it.
export const startCdpHistoryRecorder = async (
  cdpPort,
  { waitMs = 120_000, pollMs = 50 } = {}
) => {
  const deadline = Date.now() + waitMs;
  let version;
  while (Date.now() < deadline) {
    version = await fetch(`http://127.0.0.1:${cdpPort}/json/version`, {
      signal: AbortSignal.timeout(1000),
    })
      .then((response) => response.json())
      .catch(() => undefined);
    if (version?.webSocketDebuggerUrl) break;
    await sleep(pollMs);
  }
  if (!version?.webSocketDebuggerUrl)
    throw new Error(`no browser target on CDP port ${cdpPort}`);

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let seq = 0;
  const pending = new Map();
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      seq += 1;
      const id = seq;
      pending.set(id, (message) =>
        message.error
          ? reject(new Error(`${method}: ${message.error.message}`))
          : resolve(message.result)
      );
      ws.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId && { sessionId }),
        })
      );
    });

  // targetId -> { type, url, waitingForDebugger, sessionId, documents, error }
  const targets = new Map();
  const sessions = new Map();
  // `${sessionId}:${requestId}` -> response record
  const responses = new Map();
  const frames = [];
  const reads = new Set();
  const autoAttach = {
    autoAttach: true,
    waitForDebuggerOnStart: true,
    flatten: true,
  };

  const onAttached = async ({ sessionId, targetInfo, waitingForDebugger }) => {
    const target = {
      type: targetInfo.type,
      url: targetInfo.url,
      waitingForDebugger,
      sessionId,
      documents: [],
    };
    targets.set(targetInfo.targetId, target);
    sessions.set(sessionId, target);
    // Send the commands without a wait between them: a target that waits for
    // the debugger answers Network.enable only after it runs. CDP runs the
    // commands of a session in order, so Network is on before the target
    // runs. Always let the target run: a target that waits forever stops the
    // app.
    const network = send('Network.enable', {}, sessionId).then(
      () => {
        target.networkEnabled = true;
      },
      (error) => {
        target.error = errorText(error);
      }
    );
    // Children of the target (frames, workers) wait as well.
    const children = send('Target.setAutoAttach', autoAttach, sessionId).catch(
      () => undefined
    );
    const run = send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(
      () => undefined
    );
    await Promise.all([network, children, run]);
  };

  const readBody = (sessionId, requestId, record) => {
    const read = send('Network.getResponseBody', { requestId }, sessionId)
      .then(({ body, base64Encoded }) => {
        record.body = base64Encoded
          ? Buffer.from(body, 'base64').toString('utf8')
          : body;
      })
      .catch((error) => {
        record.error = errorText(error);
      })
      .finally(() => reads.delete(read));
    reads.add(read);
  };

  const events = {
    'Target.attachedToTarget': (params) => void onAttached(params),
    'Network.responseReceived': (params, sessionId) => {
      const { url } = params.response;
      if (params.type === 'Document')
        sessions.get(sessionId)?.documents.push(url);
      if (!HISTORY_URL.test(url)) return;
      responses.set(`${sessionId}:${params.requestId}`, {
        url,
        at: Date.now(),
        status: params.response.status,
      });
    },
    'Network.loadingFinished': (params, sessionId) => {
      const record = responses.get(`${sessionId}:${params.requestId}`);
      if (record) readBody(sessionId, params.requestId, record);
    },
    'Network.loadingFailed': (params, sessionId) => {
      const record = responses.get(`${sessionId}:${params.requestId}`);
      // Without a responseReceived event, the page got no data.
      if (record) record.error = `loading failed: ${params.errorText}`;
    },
    'Network.webSocketFrameReceived': (params) => {
      frames.push({ at: Date.now(), data: params.response?.payloadData });
    },
  };

  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined) {
      const resolve = pending.get(message.id);
      pending.delete(message.id);
      if (typeof resolve === 'function') resolve(message);
      return;
    }
    const handler = Object.hasOwn(events, message.method) ? events[message.method] : undefined;
    if (typeof handler === 'function') handler(message.params, message.sessionId);
  });

  await send('Target.setAutoAttach', autoAttach);

  return {
    // The recording covers a target only when the recorder held it before it
    // started (waitingForDebugger), turned on Network without an error, and
    // saw its document load.
    coverageOf: (targetId) => {
      const target = targets.get(targetId);
      if (!target)
        return { ok: false, reason: 'the recorder never attached the webview' };
      if (target.waitingForDebugger !== true)
        return {
          ok: false,
          reason: 'the recorder attached the webview after it started',
        };
      if (target.error)
        return { ok: false, reason: `Network.enable failed: ${target.error}` };
      if (target.networkEnabled !== true)
        return { ok: false, reason: 'Network.enable did not answer' };
      if (!target.documents.length)
        return {
          ok: false,
          reason: 'the recorder saw no document load of the webview',
        };
      return { ok: true, documents: target.documents.length };
    },
    // Waits until every started body read ends.
    settle: async (timeoutMs = 15_000) => {
      const end = Date.now() + timeoutMs;
      while (reads.size && Date.now() < end) await sleep(100);
    },
    responses: () => [...responses.values()],
    frames: () => frames,
    targets: () =>
      [...targets.entries()].map(([targetId, t]) => ({
        targetId,
        type: t.type,
        waitingForDebugger: t.waitingForDebugger,
        networkEnabled: t.networkEnabled === true,
        documents: t.documents.length,
      })),
    close: () => ws.close(),
  };
};

const selfTest = () => {
  const needleId = 'NeedleId12345678x';
  const hitAt = 1_000_000;
  const sync = (at, ids, extra = {}) => ({
    url: 'http://localhost:3500/api/v1/chat.syncMessages?roomId=r1&type=UPDATED&count=100',
    at,
    body: JSON.stringify({
      result: { updated: ids.map((_id) => ({ _id })), deleted: [] },
      success: true,
    }),
    ...extra,
  });
  const base = { needleId, hit: true, hitAt, coverage: { ok: true } };
  const cases = [
    {
      name: 'no syncMessages response holds the needle: pass',
      input: { ...base, responses: [sync(hitAt - 500, ['other1', 'other2'])] },
      ok: true,
    },
    {
      name: 'a syncMessages response before the hit holds the needle: fail',
      input: {
        ...base,
        responses: [
          sync(hitAt - 3000, ['other1']),
          sync(hitAt - 500, ['other2', needleId]),
        ],
      },
      ok: false,
    },
    {
      name: 'the needle arrives inside the margin after the hit: fail',
      input: {
        ...base,
        responses: [sync(hitAt + HIT_MARGIN_MS - 1, [needleId])],
      },
      ok: false,
    },
    {
      name: 'the needle arrives well after the hit: pass',
      input: {
        ...base,
        responses: [sync(hitAt + HIT_MARGIN_MS + 5000, [needleId])],
      },
      ok: true,
    },
    {
      name: 'a response without an arrival time holds the needle: fail',
      input: { ...base, responses: [sync(undefined, [needleId])] },
      ok: false,
    },
    {
      name: 'a syncMessages body could not be read: fail',
      input: {
        ...base,
        responses: [
          {
            url: 'http://localhost:3500/api/v1/chat.syncMessages?roomId=r1',
            at: hitAt - 100,
            error: 'No resource with given identifier found',
          },
        ],
      },
      ok: false,
    },
    {
      name: 'a request failed before any response: it does not count',
      input: {
        ...base,
        responses: [
          {
            url: 'http://localhost:3500/api/v1/chat.syncMessages?roomId=r1',
            noResponse: true,
            error: 'TypeError: NetworkError',
          },
        ],
      },
      ok: true,
    },
    {
      name: 'a WebSocket frame before the hit holds the needle: fail',
      input: {
        ...base,
        frames: [
          { at: hitAt - 10, data: `a["{\\"_id\\":\\"${needleId}\\"}"]` },
        ],
      },
      ok: false,
    },
    {
      name: 'no hit: fail',
      input: { ...base, hit: false },
      ok: false,
    },
    {
      name: 'the recording can have missed a response: fail',
      input: {
        ...base,
        coverage: {
          ok: false,
          reason: 'the recorder attached the webview after it started',
        },
      },
      ok: false,
    },
    {
      name: 'no coverage data: fail',
      input: { ...base, coverage: undefined },
      ok: false,
    },
    {
      name: 'other requests that hold the needle do not count',
      input: {
        ...base,
        responses: [
          {
            url: 'http://localhost:3500/api/v1/rooms.get',
            at: hitAt - 10,
            body: needleId,
          },
        ],
      },
      ok: true,
    },
  ];
  const coverageCases = [
    {
      name: 'the page recorder has a twin for each network response: covered',
      input: {
        network: [sync(10, []), sync(20, [])],
        recorded: [sync(11, []), sync(21, [])],
        until: 100,
      },
      ok: true,
    },
    {
      name: 'the page recorder missed a network response: not covered',
      input: {
        network: [sync(10, []), sync(20, [])],
        recorded: [sync(11, [])],
        until: 100,
      },
      ok: false,
    },
    {
      name: 'a network response after `until` does not need a twin',
      input: { network: [sync(200, [])], recorded: [], until: 100 },
      ok: true,
    },
  ];
  let failed = 0;
  for (const c of cases) {
    const result = judgeSavedIndexHit(c.input);
    const good = result.ok === c.ok;
    if (!good) failed += 1;
    console.log(
      `${good ? 'PASS' : 'FAIL'} ${c.name} (ok=${result.ok}${result.reasons.length ? `: ${result.reasons.join('; ')}` : ''})`
    );
  }
  for (const c of coverageCases) {
    const result = pageRecordingCoverage(c.input);
    const good = result.ok === c.ok;
    if (!good) failed += 1;
    console.log(
      `${good ? 'PASS' : 'FAIL'} ${c.name} (ok=${result.ok}${result.reason ? `: ${result.reason}` : ''})`
    );
  }
  console.log(
    `SELF-TEST ${failed ? 'FAIL' : 'PASS'}: ${cases.length + coverageCases.length - failed} of ${cases.length + coverageCases.length}`
  );
  return failed === 0;
};

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]) &&
  process.argv.includes('--self-test')
) {
  process.exit(selfTest() ? 0 : 1);
}
