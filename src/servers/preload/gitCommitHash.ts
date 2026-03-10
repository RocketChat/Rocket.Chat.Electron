import { dispatch } from '../../store';
import { WEBVIEW_GIT_COMMIT_HASH_CHECK } from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl } from './urls';

export const setGitCommitHash = (
  gitCommitHash: Server['gitCommitHash']
): void => {
  dispatch({
    type: WEBVIEW_GIT_COMMIT_HASH_CHECK,
    payload: {
      url: getServerUrl(),
      gitCommitHash,
    },
  });
};
