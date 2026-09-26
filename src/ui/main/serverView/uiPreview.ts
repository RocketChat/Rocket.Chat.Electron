import { pathToFileURL } from 'url';

import { handle } from '../../../ipc/main';
import { select } from '../../../store';
import {
  askForUiOverride,
  warnAboutUiOverrideRequiresDeveloperMode,
  warnAboutUiPreviewFailure,
} from '../dialogs';
import {
  applyUiOverride,
  clearUiOverride,
  listUiOverrides,
} from './uiOverride';
import { getUiPreviewReference, pullUiPreview } from './uiPreviewPackage';

export type UiPreviewSource = {
  bundle?: string;
  pr?: string;
  sha?: string;
};

export const resolveUiPreviewSource = ({
  bundle,
  pr,
  sha,
}: UiPreviewSource): { label: string; load: () => Promise<string> } | null => {
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

// The Settings field takes a PR number (`42364` or `#42364`) or a bundle URL.
export const parseUiPreviewInput = (input: string): UiPreviewSource => {
  const value = input.trim().replace(/^#/, '');
  return /^\d+$/.test(value) ? { pr: value } : { bundle: value };
};

export const isUiPreviewAllowed = async (): Promise<boolean> => {
  if (select(({ isDeveloperModeEnabled }) => isDeveloperModeEnabled)) {
    return true;
  }
  await warnAboutUiOverrideRequiresDeveloperMode();
  return false;
};

export const requestUiPreview = async (
  serverUrl: string,
  source: UiPreviewSource
): Promise<boolean> => {
  const resolved = resolveUiPreviewSource(source);
  if (!resolved) {
    await warnAboutUiPreviewFailure(
      `Not a PR number or an http(s) URL: ${source.bundle ?? source.pr ?? ''}`
    );
    return false;
  }

  if (!(await askForUiOverride(serverUrl, resolved.label))) {
    return false;
  }

  try {
    await applyUiOverride(serverUrl, await resolved.load(), resolved.label);
    return true;
  } catch (error) {
    await warnAboutUiPreviewFailure(
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
};

export const setupUiPreviewIpc = (): void => {
  // Only the app's own pages (the root and settings windows) may ask; server content is never file://.
  const isFromAppPage = (webContents: Electron.WebContents) =>
    webContents.getURL().startsWith('file://');
  const isKnownServer = (serverUrl: string) =>
    select(({ servers }) => servers.some((server) => server.url === serverUrl));

  handle('ui-preview/list', async (webContents) =>
    isFromAppPage(webContents) ? listUiOverrides() : {}
  );

  handle('ui-preview/apply', async (webContents, serverUrl, input) => {
    if (
      !isFromAppPage(webContents) ||
      !isKnownServer(serverUrl) ||
      !(await isUiPreviewAllowed())
    ) {
      return false;
    }
    return requestUiPreview(serverUrl, parseUiPreviewInput(input));
  });

  handle('ui-preview/restore', async (webContents, serverUrl) => {
    if (isFromAppPage(webContents)) {
      await clearUiOverride(serverUrl);
    }
  });
};
