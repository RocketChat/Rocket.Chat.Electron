import { fileURLToPath, pathToFileURL } from 'url';

import type { WebContents } from 'electron';
import { BrowserWindow, net } from 'electron';

import { handle } from '../../../ipc/main';
import { loggers } from '../../../logging/scopes';
import { dispatch, select } from '../../../store';
import {
  UI_PREVIEW_HISTORY_ENTRY_ADDED,
  UI_PREVIEW_HISTORY_ENTRY_UPDATED,
} from '../../actions';
import type { UiPreviewHistoryEntry } from '../../common';
import {
  askForUiOverride,
  warnAboutUiOverrideRequiresDeveloperMode,
  warnAboutUiPreviewFailure,
} from '../dialogs';
import type { UiOverrideSource } from './uiOverride';
import {
  applyUiOverride,
  clearUiOverride,
  getUiOverride,
  getUiOverrideBundleUrls,
  getUiOverrideServerUrls,
  getUiOverrideVersion,
} from './uiOverride';
import {
  getUiPreviewReference,
  inspectUiPreview,
  pruneUiPreviews,
  pullUiPreview,
} from './uiPreviewPackage';

export type UiPreviewSource = {
  bundle?: string;
  develop?: boolean;
  pr?: string;
  sha?: string;
};

// `key` is the Settings input that brings the source back, which also keys its history entry.
type RegistryTarget = { key: string; name: string; tag: string };
type BundleTarget = { key: string; name: string; url: string };

const describeUiPreviewSource = ({
  bundle,
  develop,
  pr,
  sha,
}: UiPreviewSource): RegistryTarget | BundleTarget | null => {
  if (develop) {
    return { key: 'develop', name: 'develop', tag: 'develop' };
  }

  if (pr) {
    if (!/^\d+$/.test(pr) || (sha && !/^[a-f0-9]{40}$/.test(sha))) {
      return null;
    }
    // A pinned commit never moves, so it is kept apart from the PR's own tag.
    return {
      key: sha ? `${pr}@${sha}` : pr,
      name: `PR #${pr}`,
      tag: sha ?? `pr-${pr}`,
    };
  }

  if (!bundle) {
    return null;
  }
  try {
    const { protocol, href } = new URL(bundle);
    return protocol === 'https:' || protocol === 'http:'
      ? { key: href, name: href, url: href }
      : null;
  } catch {
    return null;
  }
};

// Keeps a listed build's commit and date in step with what the registry last said; unlisted builds are ignored.
const recordBuild = (entry: UiPreviewHistoryEntry) =>
  dispatch({ type: UI_PREVIEW_HISTORY_ENTRY_UPDATED, payload: entry });

// Once pulled, the label names the commit, so an update shows whether a newer build arrived.
const fromRegistry = ({ key, name, tag }: RegistryTarget): UiOverrideSource => {
  const reference = getUiPreviewReference(tag);
  return {
    key,
    label: `${name} (${reference})`,
    load: async () => {
      const { dir, digest, revision, createdAt } = await pullUiPreview(tag);
      recordBuild({ input: key, label: name, digest, revision, createdAt });
      return {
        url: pathToFileURL(dir).href,
        label: revision
          ? `${name} @ ${revision.slice(0, 7)} (${reference})`
          : `${name} (${reference})`,
        version: digest,
      };
    },
  };
};

export const resolveUiPreviewSource = (
  source: UiPreviewSource
): UiOverrideSource | null => {
  const target = describeUiPreviewSource(source);
  if (!target) {
    return null;
  }
  if ('tag' in target) {
    return fromRegistry(target);
  }
  const { key, url } = target;
  return { key, label: url, load: async () => ({ url, label: url }) };
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

export type UiPreviewHistoryResult =
  | { status: 'added' }
  // Nothing newer than the listed build, and every workspace running it already has it.
  | { status: 'current' }
  // A newer build is listed, and every workspace running the entry loaded it.
  | { status: 'updated' }
  | { status: 'failed'; message: string };

const failure = (error: unknown) => ({
  status: 'failed' as const,
  message: error instanceof Error ? error.message : String(error),
});

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

// Removes the bundles no workspace uses any more; a failure only costs disk space, so it never fails the apply.
const pruneUnusedBundles = () =>
  pruneUiPreviews(
    getUiOverrideBundleUrls()
      .filter((url) => url.startsWith('file:'))
      .map((url) => fileURLToPath(url))
  ).catch((error) =>
    loggers.ui.warn('Failed to remove unused UI preview bundles', error)
  );

const applyUiPreview = async (
  serverUrl: string,
  source: UiOverrideSource
): Promise<UiPreviewResult> => {
  try {
    const label = await applyUiOverride(serverUrl, source);
    if (label === null) {
      return { status: 'cancelled' };
    }
    void pruneUnusedBundles();
    return { status: 'applied', label };
  } catch (error) {
    return failure(error);
  }
};

// One pull per server at a time; a request while one runs is dropped rather than queued.
const updating = new Map<string, Promise<UiPreviewResult>>();

// Pulls the same source again, so a tag that moved on (`develop`, `pr-<n>`) loads its newest build without asking again.
// Resolves to null when nothing is applied or a pull for the server is already running.
const updateUiPreview = async (
  serverUrl: string
): Promise<UiPreviewResult | null> => {
  const source = getUiOverride(serverUrl);
  if (!source || updating.has(serverUrl)) {
    return null;
  }

  // Starts within the call, so a restore requested after it always wins.
  const update = applyUiPreview(serverUrl, source);
  updating.set(serverUrl, update);
  try {
    return await update;
  } finally {
    updating.delete(serverUrl);
  }
};

export const updateUiPreviewWithDialog = async (
  serverUrl: string
): Promise<void> => {
  if (!getUiOverride(serverUrl)) {
    return;
  }
  if (!isDeveloperModeEnabled()) {
    await warnAboutUiOverrideRequiresDeveloperMode();
    return;
  }
  const result = await updateUiPreview(serverUrl);
  if (result?.status === 'failed') {
    await warnAboutUiPreviewFailure(result.message);
  }
};

// Confirms the build exists without downloading it: a tag's manifest, or a served bundle's index.html.
const inspectTarget = async (
  target: RegistryTarget | BundleTarget
): Promise<UiPreviewHistoryEntry> => {
  const { key: input, name: label } = target;
  if ('tag' in target) {
    return { input, label, ...(await inspectUiPreview(target.tag)) };
  }

  const index = new URL(
    'index.html',
    target.url.endsWith('/') ? target.url : `${target.url}/`
  ).href;
  const response = await net.fetch(index, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${index} responded ${response.status}`);
  }
  return { input, label };
};

const describeInput = (input: string) => {
  const target = describeUiPreviewSource(parseUiPreviewInput(input));
  if (!target) {
    throw new Error(
      `Not develop, a PR number or an http(s) URL: ${input.trim()}`
    );
  }
  return target;
};

// Lists a build only once it is known to exist; adding a listed one again moves it to the top.
export const addUiPreview = async (
  input: string
): Promise<UiPreviewHistoryResult> => {
  try {
    const entry = await inspectTarget(describeInput(input));
    dispatch({ type: UI_PREVIEW_HISTORY_ENTRY_ADDED, payload: entry });
    return { status: 'added' };
  } catch (error) {
    return failure(error);
  }
};

// Reads the entry's source again, and loads a newer build into every workspace running it without asking again.
export const refreshUiPreview = async (
  input: string
): Promise<UiPreviewHistoryResult> => {
  try {
    const build = await inspectTarget(describeInput(input));
    const listed = select(({ uiPreviewHistory }) =>
      uiPreviewHistory.find((entry) => entry.input === build.input)
    );
    recordBuild(build);

    // A served bundle names no version, so a workspace running one always reloads.
    const isBehind = (serverUrl: string) =>
      getUiOverrideServerUrls(build.input).includes(serverUrl) &&
      (!build.digest || getUiOverrideVersion(serverUrl) !== build.digest);

    // A pull already running for a workspace may have read the tag before it moved, so it is awaited and checked again.
    const reload = async (serverUrl: string) => {
      await updating.get(serverUrl);
      return isBehind(serverUrl) ? updateUiPreview(serverUrl) : null;
    };

    const stale = getUiOverrideServerUrls(build.input).filter(isBehind);
    const results = await Promise.all(stale.map(reload));
    const failed = results.find((result) => result?.status === 'failed');
    if (failed?.status === 'failed') {
      return failed;
    }

    // A reload pulls after the inspection, so an applied or superseded one holds this build or a newer one.
    const left = stale.filter(
      (serverUrl, index) => !results[index] && isBehind(serverUrl)
    );
    if (left.length > 0) {
      return {
        status: 'failed',
        message: `${left.join(', ')} still runs an older build; refresh again`,
      };
    }

    return stale.length === 0 && listed?.digest === build.digest
      ? { status: 'current' }
      : { status: 'updated' };
  } catch (error) {
    return failure(error);
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
  const rejectionOf = (webContents: WebContents) => {
    if (!isFromAppPage(webContents)) {
      return { status: 'failed' as const, message: 'Request not allowed' };
    }
    if (!isDeveloperModeEnabled()) {
      return { status: 'failed' as const, message: 'Developer Mode is off' };
    }
    return null;
  };

  handle(
    'ui-preview/apply',
    async (webContents, serverUrl, input): Promise<UiPreviewResult> => {
      if (!isKnownServer(serverUrl)) {
        return { status: 'failed', message: 'Request not allowed' };
      }
      return (
        rejectionOf(webContents) ??
        requestUiPreview(
          serverUrl,
          parseUiPreviewInput(input),
          BrowserWindow.fromWebContents(webContents) ?? undefined
        )
      );
    }
  );

  handle('ui-preview/restore', async (webContents, serverUrl) => {
    if (isFromAppPage(webContents)) {
      await clearUiOverride(serverUrl);
    }
  });

  handle(
    'ui-preview/add',
    async (webContents, input): Promise<UiPreviewHistoryResult> =>
      rejectionOf(webContents) ?? addUiPreview(input)
  );

  handle(
    'ui-preview/refresh',
    async (webContents, input): Promise<UiPreviewHistoryResult> =>
      rejectionOf(webContents) ?? refreshUiPreview(input)
  );
};
