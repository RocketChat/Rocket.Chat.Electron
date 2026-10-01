import { pathToFileURL } from 'url';

import type { WebContents } from 'electron';
import { BrowserWindow } from 'electron';

import { handle } from '../../../ipc/main';
import { select } from '../../../store';
import {
  askForUiOverride,
  warnAboutUiOverrideRequiresDeveloperMode,
  warnAboutUiPreviewFailure,
} from '../dialogs';
import type { UiOverrideSource } from './uiOverride';
import { applyUiOverride, clearUiOverride, getUiOverride } from './uiOverride';
import { getUiPreviewReference, pullUiPreview } from './uiPreviewPackage';

export type UiPreviewSource = {
  bundle?: string;
  develop?: boolean;
  pr?: string;
  sha?: string;
};

export const resolveUiPreviewSource = ({
  bundle,
  develop,
  pr,
  sha,
}: UiPreviewSource): UiOverrideSource | null => {
  if (develop) {
    return {
      label: `develop (${getUiPreviewReference('develop')})`,
      load: async () => pathToFileURL(await pullUiPreview('develop')).href,
    };
  }

  if (pr) {
    if (!/^\d+$/.test(pr) || (sha && !/^[a-f0-9]{40}$/.test(sha))) {
      return null;
    }
    const tag = sha ?? `pr-${pr}`;
    return {
      label: `PR #${pr} (${getUiPreviewReference(tag)})`,
      load: async () => pathToFileURL(await pullUiPreview(tag)).href,
    };
  }

  if (!bundle) {
    return null;
  }
  try {
    const { protocol, href } = new URL(bundle);
    return protocol === 'https:' || protocol === 'http:'
      ? { label: href, load: async () => href }
      : null;
  } catch {
    return null;
  }
};

// The Settings field takes `develop`, a PR number (`42364` or `#42364`) or a bundle URL.
export const parseUiPreviewInput = (input: string): UiPreviewSource => {
  const value = input.trim().replace(/^#/, '');
  if (value.toLowerCase() === 'develop') {
    return { develop: true };
  }
  return /^\d+$/.test(value) ? { pr: value } : { bundle: value };
};

// The deep link takes `develop`, `develop=true` or `develop=1`; any other value leaves `pr` or `bundle` in charge.
export const parseUiPreviewFlag = (value: string | null): boolean =>
  value !== null && /^(|true|1)$/i.test(value);

export type UiPreviewResult =
  | { status: 'applied'; label: string }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

const isDeveloperModeEnabled = () =>
  select(({ isDeveloperModeEnabled }) => isDeveloperModeEnabled);

export const isUiPreviewAllowed = async (): Promise<boolean> => {
  if (isDeveloperModeEnabled()) {
    return true;
  }
  await warnAboutUiOverrideRequiresDeveloperMode();
  return false;
};

export const requestUiPreview = async (
  serverUrl: string,
  source: UiPreviewSource,
  parentWindow?: BrowserWindow
): Promise<UiPreviewResult> => {
  const resolved = resolveUiPreviewSource(source);
  if (!resolved) {
    return {
      status: 'failed',
      message: `Not develop, a PR number or an http(s) URL: ${source.bundle ?? source.pr ?? ''}`,
    };
  }

  if (!(await askForUiOverride(serverUrl, resolved.label, parentWindow))) {
    return { status: 'cancelled' };
  }

  return applyUiPreview(serverUrl, resolved);
};

const applyUiPreview = async (
  serverUrl: string,
  source: UiOverrideSource
): Promise<UiPreviewResult> => {
  try {
    return (await applyUiOverride(serverUrl, source))
      ? { status: 'applied', label: source.label }
      : { status: 'cancelled' };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

// One pull per server at a time; a click while one runs is dropped rather than queued.
const updating = new Set<string>();

// Pulls the same source again, so a tag that moved on (`develop`, `pr-<n>`) loads its newest build without asking again.
export const updateUiPreviewWithDialog = async (
  serverUrl: string
): Promise<void> => {
  const source = getUiOverride(serverUrl);
  if (!source || updating.has(serverUrl)) {
    return;
  }

  updating.add(serverUrl);
  try {
    if (!isDeveloperModeEnabled()) {
      await warnAboutUiOverrideRequiresDeveloperMode();
      return;
    }
    // Starts within the click, so a restore clicked after it always wins.
    const result = await applyUiPreview(serverUrl, source);
    if (result.status === 'failed') {
      await warnAboutUiPreviewFailure(result.message);
    }
  } finally {
    updating.delete(serverUrl);
  }
};

// The deep link has no page to report into, so its failures become a dialog.
export const requestUiPreviewWithDialog = async (
  serverUrl: string,
  source: UiPreviewSource
): Promise<void> => {
  const result = await requestUiPreview(serverUrl, source);
  if (result.status === 'failed') {
    await warnAboutUiPreviewFailure(result.message);
  }
};

export const setupUiPreviewIpc = (): void => {
  // Only the app's own pages (the root and settings windows) may ask; server content is never file://.
  const isFromAppPage = (webContents: WebContents) =>
    webContents.getURL().startsWith('file://');
  const isKnownServer = (serverUrl: string) =>
    select(({ servers }) => servers.some((server) => server.url === serverUrl));

  handle(
    'ui-preview/apply',
    async (webContents, serverUrl, input): Promise<UiPreviewResult> => {
      if (!isFromAppPage(webContents) || !isKnownServer(serverUrl)) {
        return { status: 'failed', message: 'Request not allowed' };
      }
      if (!isDeveloperModeEnabled()) {
        return { status: 'failed', message: 'Developer Mode is off' };
      }
      return requestUiPreview(
        serverUrl,
        parseUiPreviewInput(input),
        BrowserWindow.fromWebContents(webContents) ?? undefined
      );
    }
  );

  handle('ui-preview/restore', async (webContents, serverUrl) => {
    if (isFromAppPage(webContents)) {
      await clearUiOverride(serverUrl);
    }
  });
};
