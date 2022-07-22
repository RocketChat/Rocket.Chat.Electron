import { dispatch } from '../../store';
import { WEBVIEW_GIT_COMMIT_HASH_CHANGED } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './urls';

export const setGitCommitHash = (
  gitCommitHash: Server['gitCommitHash']
): void => {
  dispatch({
    type: WEBVIEW_GIT_COMMIT_HASH_CHANGED,
    payload: {
      url: getServerUrl(),
      gitCommitHash,
    },
  });
};
