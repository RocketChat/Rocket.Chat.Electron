import { satisfies, coerce } from 'semver';

import { convertToURL } from '../common/convertToURL';
import type { ServerUrlResolutionResult } from '../common/types/ServerUrlResolutionResult';
import { ServerUrlResolutionStatus } from '../common/types/ServerUrlResolutionStatus';
import { fetchServerInformation } from './fetchServerInformation';

const REQUIRED_SERVER_VERSION_RANGE = '>=2.0.0';

export const resolveServerUrl = async (
  input: string
): Promise<ServerUrlResolutionResult> => {
  let url: URL;

  try {
    url = convertToURL(input);
  } catch (error) {
    return [input, ServerUrlResolutionStatus.INVALID_URL, error];
  }

  let version: string;

  try {
    [url, version] = await fetchServerInformation(url);
  } catch (error) {
    if (
      !/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(input)
    ) {
      return resolveServerUrl(`https://${input}.rocket.chat`);
    }

    if (error?.name === 'AbortError') {
      return [url.href, ServerUrlResolutionStatus.TIMEOUT, error];
    }

    return [url.href, ServerUrlResolutionStatus.INVALID, error];
  }

  const semver = coerce(version);

  if (!semver || !satisfies(semver, REQUIRED_SERVER_VERSION_RANGE)) {
    return [
      url.href,
      ServerUrlResolutionStatus.INVALID,
      new Error(
        `incompatible server version (${version}, expected ${REQUIRED_SERVER_VERSION_RANGE})`
      ),
    ];
  }

  return [url.href, ServerUrlResolutionStatus.OK];
};
