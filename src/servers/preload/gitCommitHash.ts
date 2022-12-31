import { dispatch } from '../../store';
import { WEBVIEW_GIT_COMMIT_HASH_CHECK } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './urls';

export const setGitCommitHash = (
  gitCommitHash: Server['gitCommitHash']
): void => {
  console.log('setGitCommitHash', gitCommitHash);
  dispatch({
    type: WEBVIEW_GIT_COMMIT_HASH_CHECK,
    payload: {
      url: getServerUrl(),
      gitCommitHash,
    },
  });
};
