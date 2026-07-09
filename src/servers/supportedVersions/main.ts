import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import axios from 'axios';
import { ipcMain, powerMonitor } from 'electron';
import ElectronStore from 'electron-store';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import { coerce, satisfies } from 'semver';
import semverGte from 'semver/functions/gte';

import { dispatch, listen, select } from '../../store';
import {
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING,
  WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
  WEBVIEW_SERVER_VERSION_UPDATED,
  WEBVIEW_READY,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_SERVER_RELOADED,
  SUPPORTED_VERSION_DIALOG_DISMISS,
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
  WEBVIEW_GIT_COMMIT_HASH_CHANGED,
} from '../../ui/actions';
import * as urls from '../../urls';
import type { Server } from '../common';
import type {
  CloudInfo,
  Dictionary,
  Message,
  ServerInfo,
  SupportedVersions,
} from './types';

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvZ/T/RHOr6+yo/iMLUlf
agMiMLFxQR/5Qtc85ykMBvKZqbBGb9zU68VB9n54alrbZG5FdcHkSJXgJIBXF2bk
TGTfBi58JmltZirSWzvXoXnT4ieGNZv+BqnP9zzj9HXOVhVncbRmJPEIJOZfL9AQ
beix3rPgZx3ZepAaoMQnz11dZKDGzkMN75WkTdf324X3DeFgLVmjsYuAcLl/AJMA
uPKSSt0XOQUsfrT7rEqXIrj8rIJcWxIHICMRrwfjw2Qh+3pfIrh7XSzxlW4zCKBN
RpavrrCnpOFRfkC5T9eMKLgyapjufOtbjuzu25N3urBsg6oRFNzsGXWp1C7DwUO2
kwIDAQAB
-----END PUBLIC KEY-----`;

const decodeSupportedVersions = (token: string) =>
  jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as SupportedVersions;

const supportedVersionsStore = new ElectronStore<{
  [key: string]: SupportedVersions;
}>({
  name: 'supportedVersions',
});

let builtinSupportedVersions: SupportedVersions | undefined;

const getBuiltinSupportedVersions = async (): Promise<
  SupportedVersions | undefined
> => {
  if (builtinSupportedVersions) return builtinSupportedVersions;

  try {
    const filePath = join(__dirname, 'supportedVersions.jwt');
    const encodedToken = await readFile(filePath, 'utf8');
    builtinSupportedVersions = decodeSupportedVersions(encodedToken);
    return builtinSupportedVersions;
  } catch (e) {
    console.error('Error loading supportedVersions.jwt', e);
    return undefined;
  }
};

const logRequestError =
  (description: string) =>
  (error: unknown): undefined => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `Couldn't load ${description}: ${error.response.status} ${error.response.data}`
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(`Couldn't load ${description}: ${error.message}`);
      }
    } else {
      console.error(`Fetching ${description} error:`, error);
    }
    return undefined;
  };

const getCacheKey = (serverUrl: string): string =>
  `supportedVersions:${serverUrl}`;

// Missing/malformed timestamps sort as the oldest possible value, so a source
// with no usable timestamp never wins a freshness comparison it shouldn't.
const parseTimestamp = (value?: string): number => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const loadFromCache = (serverUrl: string): SupportedVersions | undefined => {
  try {
    const cached = supportedVersionsStore.get(getCacheKey(serverUrl));
    if (!cached) return undefined;
    return cached as SupportedVersions;
  } catch (error) {
    console.warn(`Error loading cache for ${serverUrl}:`, error);
    return undefined;
  }
};

const saveToCache = (serverUrl: string, data: SupportedVersions): void => {
  try {
    supportedVersionsStore.set(getCacheKey(serverUrl), data);
  } catch (error) {
    console.warn(`Error saving cache for ${serverUrl}:`, error);
  }
};

const withRetries = async <T>(
  fetchFn: () => Promise<T | undefined>,
  maxAttempts: number = 3,
  delayMs: number = 2000
): Promise<T | undefined> => {
  const attempt = async (attemptNumber: number): Promise<T | undefined> => {
    try {
      const result = await fetchFn();
      if (result !== undefined) {
        return result;
      }
    } catch (error) {
      // Log but continue to next attempt
      if (attemptNumber === maxAttempts) {
        // Last attempt failed
        return undefined;
      }
    }

    // If we haven't exhausted attempts, wait then try again
    if (attemptNumber < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return attempt(attemptNumber + 1);
    }

    return undefined;
  };

  return attempt(1);
};

const getCloudInfo = async (
  url: string,
  uniqueId: string
): Promise<CloudInfo | undefined> => {
  const domain = new URL(url).hostname;
  const response = await axios.get<CloudInfo>(
    urls.supportedVersions({ domain, uniqueId })
  );
  return response.data;
};

const getServerInfo = async (url: string): Promise<ServerInfo> => {
  const response = await axios.get<ServerInfo>(urls.server(url).info);
  return response.data;
};

const getUniqueId = async (
  url: string,
  version: string
): Promise<string | null> => {
  const validVersion = coerce(version?.trim() || '0.0.0')?.version || '0.0.0';

  const serverUrl = semverGte(validVersion, '7.0.0')
    ? urls.server(url).uniqueId
    : urls.server(url).setting('uniqueID');

  try {
    const response = await axios.get<{ settings: { value: string }[] }>(
      serverUrl
    );
    const value = response.data?.settings?.[0]?.value;

    if (!value) {
      console.warn(`No unique ID found for server ${url}`);
      return null;
    }

    return value;
  } catch (error) {
    console.warn(`Error fetching unique ID for server ${url}:`, error);
    return null;
  }
};

const messageMatchesUserRoles = (
  message: Message,
  userRoles?: string[]
): boolean => {
  // No targeting set on the message → show to everyone (default behavior).
  if (!message.roles?.length) {
    return true;
  }
  // Targeting set but we don't know the user's roles → don't show, to honor
  // the intent of restricting the message.
  if (!userRoles?.length) {
    return false;
  }
  return message.roles.some((role) => userRoles.includes(role));
};

const getExpirationMessage = ({
  messages,
  expiration,
  userRoles,
}: {
  messages?: Message[];
  expiration?: Date;
  userRoles?: string[];
}): Message | undefined => {
  if (
    !messages?.length ||
    !expiration ||
    expiration < new Date() ||
    moment(expiration).diff(new Date(), 'days') < 0
  ) {
    return;
  }
  const eligibleMessages = messages.filter((message) =>
    messageMatchesUserRoles(message, userRoles)
  );
  const sortedMessages = eligibleMessages.sort(
    (a, b) => a.remainingDays - b.remainingDays
  );
  const message = sortedMessages.find(
    ({ remainingDays }) =>
      moment(expiration).diff(new Date(), 'hours') <= remainingDays * 24
  );
  return message;
};

const isVersionExceptionForServer = (
  exceptionVersion: string,
  server: Server,
  serverVersionTilde: string
): boolean => {
  if (satisfies(coerce(exceptionVersion)?.version ?? '', serverVersionTilde)) {
    return true;
  }

  const trimmedExceptionVersion = exceptionVersion.trim();
  if (!trimmedExceptionVersion.toLowerCase().startsWith('sha-')) {
    return false;
  }

  const normalizedExceptionVersion = trimmedExceptionVersion
    .replace(/^sha-/i, '')
    .toLowerCase();
  if (!normalizedExceptionVersion) {
    return false;
  }

  const gitCommitHash = server.gitCommitHash?.trim();
  if (!gitCommitHash) {
    return false;
  }

  const normalizedGitCommitHash = gitCommitHash
    .trim()
    .replace(/^sha-/i, '')
    .toLowerCase();

  return normalizedGitCommitHash.startsWith(normalizedExceptionVersion);
};

export const getExpirationMessageTranslated = (
  i18n: Dictionary | undefined,
  message: Message,
  expiration: Date,
  language: string,
  serverName: Server['title'],
  serverUrl: Server['url'],
  serverVersion: Server['version']
) => {
  const applyParams = (message: string, params: Record<string, unknown>) => {
    const keys = Object.keys(params);
    const regex = new RegExp(`{{(${keys.join('|')})}}`, 'g');
    return message.replace(regex, (_, p1) => params[p1] as string);
  };

  const params = {
    instance_version: serverVersion,
    instance_ws_name: serverName,
    instance_domain: serverUrl,
    remaining_days: moment(expiration).diff(new Date(), 'days'),
    ...message?.params,
  };

  if (!message || !i18n) {
    return null;
  }

  const i18nLang = i18n[language] ?? i18n.en;
  if (!i18nLang) {
    return null;
  }

  const getTranslation = (key: string) =>
    key && i18nLang[key] ? applyParams(i18nLang[key], params) : undefined;

  const translatedMessage = {
    title: getTranslation(message.title),
    subtitle: getTranslation(message.subtitle),
    description: getTranslation(message.description),
    link: message.link,
  };

  return translatedMessage;
};

export const isServerVersionSupported = async (
  server: Server,
  supportedVersionsData?: SupportedVersions,
  serverCommitHash?: string
): Promise<{
  supported: boolean;
  message?: Message | undefined;
  i18n?: Dictionary | undefined;
  expiration?: Date | undefined;
}> => {
  const builtInSupportedVersions = await getBuiltinSupportedVersions();

  const versions = supportedVersionsData?.versions;
  const exceptions = supportedVersionsData?.exceptions;
  const serverVersion = server.version;
  if (!serverVersion) return { supported: true };
  if (!versions) return { supported: true };

  const serverVersionTilde = `~${serverVersion
    .split('.')
    .slice(0, 2)
    .join('.')}`;

  if (!supportedVersionsData) return { supported: true };

  // Exception entries only apply when the payload's exceptions block is scoped
  // to THIS server. The cloud-source and server-source payloads are inherently
  // scoped, but the builtin (bundled) and cache payloads can be from a different
  // tenant, so a PROVEN domain/uniqueId mismatch must disqualify the exceptions
  // to avoid cross-tenant leakage.
  // An UNKNOWN local uniqueID (e.g. settings.public restricted by enterprise
  // API ACLs) does NOT disqualify: this gate is client-side UX enforcement,
  // not a security boundary, and wrongly blocking a paying tenant is the worse
  // failure mode. Domain equality (checked whenever the payload carries a
  // domain) remains the primary scope.
  let exceptionScopeMatches = true;
  if (exceptions) {
    let hostname: string | undefined;
    try {
      hostname = new URL(server.url).hostname;
    } catch {
      hostname = undefined;
    }
    // DNS names are case-insensitive; URL.hostname is already lowercased.
    if (exceptions.domain && exceptions.domain.toLowerCase() !== hostname) {
      exceptionScopeMatches = false;
    }
    if (
      exceptions.uniqueId &&
      server.uniqueID &&
      exceptions.uniqueId !== server.uniqueID
    ) {
      exceptionScopeMatches = false;
    }
  }

  // Match against the freshly-fetched commit hash when available, falling
  // back to the persisted server.gitCommitHash.
  const serverForExceptionMatch: Server = serverCommitHash
    ? { ...server, gitCommitHash: serverCommitHash }
    : server;

  // Try exact-string and raw commit-hash match first, then semver/sha matching
  const exception = exceptionScopeMatches
    ? exceptions?.versions?.find(
        ({ version }) =>
          version === serverVersion ||
          (serverCommitHash && version === serverCommitHash) ||
          isVersionExceptionForServer(
            version,
            serverForExceptionMatch,
            serverVersionTilde
          )
      )
    : undefined;

  if (exception) {
    if (new Date(exception.expiration) > new Date()) {
      const messages =
        exception?.messages ||
        exceptions?.messages ||
        builtInSupportedVersions?.messages;
      const selectedExpirationMessage = getExpirationMessage({
        messages,
        expiration: exception.expiration,
        userRoles: server.userRoles,
      }) as Message;

      return {
        supported: true,
        message: selectedExpirationMessage,
        i18n: selectedExpirationMessage
          ? supportedVersionsData?.i18n
          : undefined,
        expiration: exception.expiration,
      };
    }
  }

  const supportedVersion = versions.find(({ version }) =>
    satisfies(coerce(version)?.version ?? '', serverVersionTilde)
  );

  if (supportedVersion) {
    if (new Date(supportedVersion.expiration) > new Date()) {
      const messages =
        supportedVersionsData?.messages || builtInSupportedVersions?.messages;

      const selectedExpirationMessage = getExpirationMessage({
        messages,
        expiration: supportedVersion.expiration,
        userRoles: server.userRoles,
      }) as Message;

      return {
        supported: true,
        message: selectedExpirationMessage,
        i18n: selectedExpirationMessage
          ? supportedVersionsData?.i18n
          : undefined,
        expiration: supportedVersion.expiration,
      };
    }
  }

  const enforcementStartDate = new Date(
    supportedVersionsData?.enforcementStartDate
  );
  if (enforcementStartDate > new Date()) {
    const selectedExpirationMessage = getExpirationMessage({
      messages: supportedVersionsData.messages,
      expiration: enforcementStartDate,
      userRoles: server.userRoles,
    }) as Message;

    return {
      supported: true,
      message: selectedExpirationMessage,
      i18n: selectedExpirationMessage ? supportedVersionsData?.i18n : undefined,
      expiration: enforcementStartDate,
    };
  }
  return { supported: false };
};

const dispatchVersionUpdated = (url: string) => (info: ServerInfo) => {
  dispatch({
    type: WEBVIEW_SERVER_VERSION_UPDATED,
    payload: {
      url,
      version: info.version,
      gitCommitHash: info.commit?.hash,
    },
  });

  if (info.commit?.hash) {
    dispatch({
      type: WEBVIEW_GIT_COMMIT_HASH_CHANGED,
      payload: {
        url,
        gitCommitHash: info.commit.hash,
      },
    });
  }

  return info;
};

const dispatchUniqueIdUpdated = (url: string) => (uniqueID: string | null) => {
  if (uniqueID) {
    dispatch({
      type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
      payload: {
        url,
        uniqueID,
      },
    });
  }

  return uniqueID;
};

const dispatchSupportedVersionsUpdated = (
  url: string,
  supportedVersions: SupportedVersions,
  { source }: { source: 'server' | 'cloud' | 'builtin' }
): void => {
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_UPDATED,
    payload: {
      url,
      supportedVersions,
      source,
    },
  });
};

// When a supported-versions payload carries a uniqueId-scoped exceptions
// block, the scope check requires server.uniqueID to equal
// exceptions.uniqueId. The server-signed fast path returns before the general
// getUniqueId call, and /api/info does not include uniqueId, so a missing or
// stale persisted uniqueID would permanently disqualify the tenant's own
// exceptions. Resolve it from the server before validating (and persist it
// for future runs, including offline cache validation).
const withExceptionScopeUniqueId = async (
  serverView: Server,
  supportedVersionsData: SupportedVersions | undefined,
  versionForUniqueId: string
): Promise<Server> => {
  const exceptionsUniqueId = supportedVersionsData?.exceptions?.uniqueId;
  if (!exceptionsUniqueId || serverView.uniqueID === exceptionsUniqueId) {
    return serverView;
  }
  const freshUniqueId = await getUniqueId(serverView.url, versionForUniqueId)
    .then(dispatchUniqueIdUpdated(serverView.url))
    .catch(logRequestError('unique ID'));
  return freshUniqueId
    ? { ...serverView, uniqueID: freshUniqueId }
    : serverView;
};

// Validates the fallback (cache/builtin) payload and dispatches the verdict.
// isServerVersionSupported can throw on a malformed cached/builtin payload
// (e.g. `versions` not an array). Left unguarded, that throw would reject
// updateSupportedVersionsData before WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR
// is dispatched, leaving supportedVersionsFetchState stuck at 'loading' —
// which suppresses the UnsupportedServer block gate (fail-open). On failure,
// only the error state is dispatched; the prior verdict is left untouched.
const validateFallbackAndDispatch = async (
  server: Server,
  serverUrl: string,
  fallbackVersions: SupportedVersions,
  fallbackSource: 'cloud' | 'builtin',
  freshCommitHash: string | undefined,
  isStale: () => boolean
): Promise<void> => {
  try {
    const fallbackSupported = await isServerVersionSupported(
      server,
      fallbackVersions,
      freshCommitHash
    );
    if (isStale()) return;
    dispatch({
      type: WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
      payload: {
        url: server.url,
        isSupportedVersion: fallbackSupported.supported,
      },
    });
    dispatchSupportedVersionsUpdated(server.url, fallbackVersions, {
      source: fallbackSource,
    });
  } catch (error) {
    console.error('Error validating fallback supported versions:', error);
  }
  if (isStale()) return;
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
    payload: { url: serverUrl },
  });
};

// Per-URL request generation counter. Each call to updateSupportedVersionsData
// bumps the counter and captures its own generation. Awaited steps inside the
// call check whether their generation is still current before dispatching, so
// an older slower request cannot overwrite a newer request's verdict when the
// listeners (WEBVIEW_READY, WEBVIEW_SERVER_RELOADED, SUPPORTED_VERSION_DIALOG_DISMISS,
// ipc refresh-supported-versions) overlap for the same URL.
const requestGenerations = new Map<string, number>();

export const updateSupportedVersionsData = async (
  serverUrl: string
): Promise<void> => {
  const server = select(({ servers }) =>
    servers.find((server) => server.url === serverUrl)
  );
  if (!server) return;

  const myGeneration = (requestGenerations.get(serverUrl) ?? 0) + 1;
  requestGenerations.set(serverUrl, myGeneration);
  const isStale = () => requestGenerations.get(serverUrl) !== myGeneration;

  // Dispatch loading state
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_LOADING,
    payload: { url: serverUrl },
  });

  const builtinSupportedVersions = await getBuiltinSupportedVersions();

  // Fetch server info with retries (3x with 2s delays)
  const serverInfoResult = await withRetries(
    () => getServerInfo(server.url),
    3,
    2000
  );

  // Build a server view that reflects the freshly-fetched version and
  // uniqueId when available, so every downstream support check
  // (server/cloud/cache/builtin) is evaluated against the same authoritative
  // identity. Current servers do NOT include `uniqueId` in /api/info, so the
  // fallback to persisted server.uniqueID is the common path.
  const serverWithFreshVersion: Server = serverInfoResult
    ? {
        ...server,
        version: serverInfoResult.version,
        uniqueID: serverInfoResult.uniqueId ?? server.uniqueID,
      }
    : server;
  const freshCommitHash = serverInfoResult?.commit?.hash;

  let serverEncoded: string | undefined;

  if (isStale()) return;

  if (serverInfoResult) {
    dispatchVersionUpdated(server.url)(serverInfoResult);

    serverEncoded = serverInfoResult.supportedVersions?.signed;

    // Try Server with retries (3x with 2s delays)
    if (serverEncoded) {
      try {
        const serverSupportedVersions = decodeSupportedVersions(serverEncoded);
        if (isStale()) return;
        saveToCache(serverUrl, serverSupportedVersions);
        const serverForValidation = await withExceptionScopeUniqueId(
          serverWithFreshVersion,
          serverSupportedVersions,
          serverInfoResult.version
        );
        if (isStale()) return;
        const supported = await isServerVersionSupported(
          serverForValidation,
          serverSupportedVersions,
          freshCommitHash
        );
        if (isStale()) return;
        // Dispatch verdict BEFORE fetchState='success' so UnsupportedServer
        // never sees a fresh success-state with the stale isSupportedVersion.
        dispatch({
          type: WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
          payload: {
            url: server.url,
            isSupportedVersion: supported.supported,
          },
        });
        dispatchSupportedVersionsUpdated(server.url, serverSupportedVersions, {
          source: 'server',
        });
        return;
      } catch (error) {
        console.error('Error decoding server supported versions:', error);
        // Clear serverEncoded to allow cloud fallback
        serverEncoded = undefined;
      }
    }
  }

  // Use freshly-fetched version (when available) for endpoint selection, so a
  // pre-7.0.0 persisted version with a fresh 7.0.0+ /api/info response does
  // not hit the legacy settings endpoint.
  const versionForUniqueId = serverInfoResult?.version ?? server.version ?? '';
  const uniqueID = await getUniqueId(server.url, versionForUniqueId)
    .then(dispatchUniqueIdUpdated(server.url))
    .catch(logRequestError('unique ID'));

  if (isStale()) return;

  // After uniqueID is known (or remained from persisted state), thread it into
  // the server view used for downstream support checks so exception scoping
  // (which requires server.uniqueID to match exceptions.uniqueId) operates on
  // fresh identity, not stale persisted state.
  const serverWithFreshIdentity: Server = {
    ...serverWithFreshVersion,
    uniqueID: uniqueID ?? serverWithFreshVersion.uniqueID,
  };

  // Fall back to the persisted uniqueID when the fresh fetch failed, so a
  // prior session's identity still enables the cloud lookup instead of
  // skipping it outright.
  const effectiveUniqueId = uniqueID ?? server.uniqueID;

  // Try Cloud with retries (3x with 2s delays) if unique ID available
  if (!serverEncoded && effectiveUniqueId) {
    const cloudVersionsWithRetry = await withRetries(
      () => getCloudInfo(server.url, effectiveUniqueId),
      3,
      2000
    );

    if (cloudVersionsWithRetry?.signed) {
      try {
        const cloudSupportedVersions = decodeSupportedVersions(
          cloudVersionsWithRetry.signed
        );
        if (isStale()) return;
        saveToCache(serverUrl, cloudSupportedVersions);
        const supported = await isServerVersionSupported(
          serverWithFreshIdentity,
          cloudSupportedVersions,
          freshCommitHash
        );
        if (isStale()) return;
        dispatch({
          type: WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
          payload: {
            url: server.url,
            isSupportedVersion: supported.supported,
          },
        });
        dispatchSupportedVersionsUpdated(server.url, cloudSupportedVersions, {
          source: 'cloud',
        });
        return;
      } catch (error) {
        console.error('Error decoding cloud supported versions:', error);
      }
    }
  }

  // Neither the server nor the cloud could be reached. Pick the freshest of
  // the two remaining sources by `timestamp` instead of always trusting the
  // cache: a persisted cache entry can predate the app's own bundled builtin
  // data (e.g. right after an app update ships a refreshed builtin list), in
  // which case trusting the stale cache indefinitely blocks servers the new
  // builtin already recognizes as supported.
  const cachedVersions = loadFromCache(serverUrl);
  const useBuiltinOverCache =
    !!builtinSupportedVersions &&
    (!cachedVersions ||
      parseTimestamp(builtinSupportedVersions.timestamp) >
        parseTimestamp(cachedVersions.timestamp));
  const fallbackVersions = useBuiltinOverCache
    ? builtinSupportedVersions
    : cachedVersions;
  const fallbackSource: 'cloud' | 'builtin' = useBuiltinOverCache
    ? 'builtin'
    : 'cloud';

  if (fallbackVersions) {
    if (isStale()) return;
    saveToCache(serverUrl, fallbackVersions);
    if (isStale()) return;
    await validateFallbackAndDispatch(
      serverWithFreshIdentity,
      serverUrl,
      fallbackVersions,
      fallbackSource,
      freshCommitHash,
      isStale
    );
    return;
  }

  if (isStale()) return;

  // No data available from any source. Preserve any prior definitive verdict
  // (sticky `false` is security-correct: do not fail-open under total
  // dependency failure). Only signal fetch error so UI knows the attempt
  // completed without fresh evidence; UnsupportedServer keeps blocking if
  // the previous determination was unsupported.
  dispatch({
    type: WEBVIEW_SERVER_SUPPORTED_VERSIONS_ERROR,
    payload: { url: serverUrl },
  });
};

const logUpdateError =
  (serverUrl: string) =>
  (error: unknown): void => {
    console.error(
      `Error updating supported versions data for ${serverUrl}:`,
      error
    );
  };

export function checkSupportedVersionServers(): void {
  listen(WEBVIEW_READY, async (action) => {
    updateSupportedVersionsData(action.payload.url).catch(
      logUpdateError(action.payload.url)
    );
  });

  listen(SUPPORTED_VERSION_DIALOG_DISMISS, async (action) => {
    updateSupportedVersionsData(action.payload.url).catch(
      logUpdateError(action.payload.url)
    );
  });

  listen(WEBVIEW_SERVER_RELOADED, async (action) => {
    updateSupportedVersionsData(action.payload.url).catch(
      logUpdateError(action.payload.url)
    );
  });

  ipcMain.handle('refresh-supported-versions', async (_event, serverUrl) => {
    updateSupportedVersionsData(serverUrl).catch(logUpdateError(serverUrl));
  });

  // 'online' only fires on real network transitions, not on wake-from-sleep
  // (e.g. laptop resumes with the same network already connected). Without
  // this, a server's supported-versions verdict can go stale for the entire
  // duration of a sleep period until the next WEBVIEW_READY/reload/dismiss.
  powerMonitor.on('resume', () => {
    const servers = select(({ servers }) => servers);
    servers.forEach((server) => {
      updateSupportedVersionsData(server.url).catch(logUpdateError(server.url));
    });
  });
}
