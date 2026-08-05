import fs from 'fs';
import path from 'path';

import { app } from 'electron';
import type { WebContents } from 'electron';

import { listen } from '../store';
import { WEBVIEW_SERVER_VERSION_UPDATED } from '../ui/actions';

const BOOT_DEADLINE_MS = 90_000;
const CONSOLE_BUFFER_LIMIT = 150;
const TIMELINE_LIMIT = 300;
const MESSAGE_LENGTH_LIMIT = 1_000;
const PROBE_TIMEOUT_MS = 5_000;

type TimelineEntry = {
  ts: string;
  event: string;
  detail?: unknown;
};

type ConsoleEntry = {
  ts: string;
  level: unknown;
  message: string;
  sourceId?: string;
  lineNumber?: number;
};

type WatchState = {
  serverUrl: string;
  webContents: WebContents;
  consoleBuffer: ConsoleEntry[];
  timeline: TimelineEntry[];
  deadlineTimer: ReturnType<typeof setTimeout> | null;
  booted: boolean;
  reportedForCurrentLoad: boolean;
};

const watchStates = new Map<string, WatchState>();

export const isBootWatchdogEnabled = (): boolean =>
  process.env.NODE_ENV === 'development' ||
  process.env.ROCKETCHAT_BOOT_WATCHDOG === 'true';

const reportFilePath = (): string =>
  path.join(app.getPath('logs'), 'boot-watchdog.jsonl');

const now = (): string => new Date().toISOString();

const record = (state: WatchState, event: string, detail?: unknown): void => {
  state.timeline.push({
    ts: now(),
    event,
    ...(detail !== undefined && { detail }),
  });
  if (state.timeline.length > TIMELINE_LIMIT) {
    state.timeline.shift();
  }
};

// Runs inside the (possibly wedged) webview to capture the state the boot got
// stuck in. Mirrors the manual CDP autopsy checklist.
const PROBE_EXPRESSION = `JSON.stringify({
  readyState: document.readyState,
  title: document.title,
  requireType: typeof window.require,
  infoModule: (() => {
    try {
      return typeof window.require === 'function'
        ? Boolean(window.require('/app/utils/rocketchat.info').Info)
        : 'no-require';
    } catch (error) {
      return 'broken: ' + (error && error.message);
    }
  })(),
  recoveryAttempts: (() => {
    try {
      return window.sessionStorage.getItem('rocketChatDesktopBootRecoveryAttempts');
    } catch (error) {
      return 'unavailable';
    }
  })(),
  serviceWorkerControlled: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
})`;

const runProbe = async (webContents: WebContents): Promise<unknown> => {
  const probe = webContents
    .executeJavaScript(PROBE_EXPRESSION, true)
    .then((value) => {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    });
  const timeout = new Promise((resolve) => {
    setTimeout(
      () => resolve(`probe timed out after ${PROBE_TIMEOUT_MS}ms`),
      PROBE_TIMEOUT_MS
    );
  });
  return Promise.race([probe, timeout]);
};

const writeReport = async (
  state: WatchState,
  reason: string
): Promise<void> => {
  const { webContents, serverUrl } = state;
  const destroyed = webContents.isDestroyed();

  let probe: unknown;
  if (!destroyed) {
    try {
      probe = await runProbe(webContents);
    } catch (error) {
      probe = `probe failed: ${error instanceof Error ? error.message : error}`;
    }
  }

  let serviceWorkers: unknown;
  try {
    serviceWorkers = destroyed
      ? 'webContents destroyed'
      : webContents.session.serviceWorkers.getAllRunning();
  } catch (error) {
    serviceWorkers = `unavailable: ${
      error instanceof Error ? error.message : error
    }`;
  }

  let processMetrics: unknown;
  try {
    const pid = destroyed ? undefined : webContents.getOSProcessId();
    processMetrics = app.getAppMetrics().filter((metric) => metric.pid === pid);
  } catch (error) {
    processMetrics = `unavailable: ${
      error instanceof Error ? error.message : error
    }`;
  }

  const report = {
    ts: now(),
    reason,
    serverUrl,
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    pageUrl: destroyed ? undefined : webContents.getURL(),
    isLoading: destroyed ? undefined : webContents.isLoading(),
    isCrashed: destroyed ? undefined : webContents.isCrashed(),
    probe,
    serviceWorkers,
    processMetrics,
    timeline: state.timeline,
    console: state.consoleBuffer,
  };

  try {
    await fs.promises.appendFile(
      reportFilePath(),
      `${JSON.stringify(report)}\n`
    );
    console.warn(
      `[bootWatchdog] ${reason} for ${serverUrl} — report appended to ${reportFilePath()}`
    );
  } catch (error) {
    console.error('[bootWatchdog] failed to write report:', error);
  }
};

const clearDeadline = (state: WatchState): void => {
  if (state.deadlineTimer !== null) {
    clearTimeout(state.deadlineTimer);
    state.deadlineTimer = null;
  }
};

const startDeadline = (state: WatchState): void => {
  clearDeadline(state);
  state.deadlineTimer = setTimeout(() => {
    state.deadlineTimer = null;
    if (state.booted || state.webContents.isDestroyed()) {
      return;
    }
    if (state.reportedForCurrentLoad) {
      return;
    }
    state.reportedForCurrentLoad = true;
    record(state, 'boot-deadline-exceeded', { deadlineMs: BOOT_DEADLINE_MS });
    writeReport(state, 'boot-deadline-exceeded');
  }, BOOT_DEADLINE_MS);
};

export const attachBootWatchdog = (
  serverUrl: string,
  webContents: WebContents
): void => {
  if (!isBootWatchdogEnabled()) {
    return;
  }

  const state: WatchState = {
    serverUrl,
    webContents,
    consoleBuffer: [],
    timeline: [],
    deadlineTimer: null,
    booted: false,
    reportedForCurrentLoad: false,
  };
  // The deadline is armed by the first committed navigation (did-navigate),
  // not here: webviews can attach and legitimately never navigate (lazy or
  // error-view panes), and reporting those is pure noise.
  watchStates.set(serverUrl, state);
  record(state, 'attached');

  webContents.on('console-message', (event) => {
    const message = String(event.message ?? '').slice(0, MESSAGE_LENGTH_LIMIT);
    state.consoleBuffer.push({
      ts: now(),
      level: event.level,
      message,
      sourceId:
        typeof event.sourceId === 'string'
          ? event.sourceId.slice(0, 200)
          : undefined,
      lineNumber:
        typeof event.lineNumber === 'number' ? event.lineNumber : undefined,
    });
    if (state.consoleBuffer.length > CONSOLE_BUFFER_LIMIT) {
      state.consoleBuffer.shift();
    }

    if (message.includes('Triggering force reload with cache clear')) {
      record(state, 'injected-recovery-triggered', message);
    }
    if (message.includes('Boot recovery attempts exhausted')) {
      record(state, 'injected-recovery-exhausted', message);
      if (!state.reportedForCurrentLoad) {
        state.reportedForCurrentLoad = true;
        writeReport(state, 'injected-recovery-exhausted');
      }
    }
  });

  // did-start-loading fires for subframe/resource loads too, so it must not
  // reset the boot cycle — a healthy booted page would re-arm the deadline
  // with no version signal left to clear it. Only a committed main-frame
  // navigation (did-navigate) starts a new boot cycle.
  webContents.on('did-start-loading', () => {
    record(state, 'did-start-loading');
  });

  webContents.on('did-navigate', (_event, url) => {
    state.booted = false;
    state.reportedForCurrentLoad = false;
    record(state, 'did-navigate', { url });
    startDeadline(state);
  });

  webContents.on('did-finish-load', () => {
    record(state, 'did-finish-load', { url: webContents.getURL() });
  });

  webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      record(state, 'did-fail-load', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
      if (isMainFrame) {
        // A visible navigation failure (ErrorView) is not a silent wedge —
        // stop the deadline so it does not produce a redundant report.
        clearDeadline(state);
      }
    }
  );

  webContents.on('render-process-gone', (_event, details) => {
    record(state, 'render-process-gone', details);
    clearDeadline(state);
    if (!state.reportedForCurrentLoad) {
      state.reportedForCurrentLoad = true;
      writeReport(state, 'render-process-gone');
    }
  });

  webContents.on('unresponsive', () => {
    record(state, 'unresponsive');
    if (!state.reportedForCurrentLoad) {
      state.reportedForCurrentLoad = true;
      writeReport(state, 'unresponsive');
    }
  });

  webContents.on('destroyed', () => {
    clearDeadline(state);
    watchStates.delete(serverUrl);
  });
};

export const setupBootWatchdog = (): void => {
  if (!isBootWatchdogEnabled()) {
    return;
  }

  console.info(
    `[bootWatchdog] enabled — wedged-boot reports will be appended to ${reportFilePath()}`
  );

  listen(WEBVIEW_SERVER_VERSION_UPDATED, (action) => {
    const { url, version } = action.payload;
    const state =
      watchStates.get(url) ??
      Array.from(watchStates.values()).find(
        (candidate) => new URL(candidate.serverUrl).href === new URL(url).href
      );
    if (!state) {
      return;
    }
    state.booted = true;
    clearDeadline(state);
    record(state, 'server-version-updated', version);
  });
};
