import { dispatch, select } from '../store';
import { askForJitsiCaptureScreenPermission } from '../ui/main/dialogs';
import { JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED } from './actions';

export const isJitsiServerAllowed = async (
  rawUrl: string
): Promise<boolean> => {
  const url = new URL(rawUrl);

  const persistedServers = Object.entries(
    select(({ allowedJitsiServers }) => allowedJitsiServers)
  )
    .filter(([, allowed]) => allowed)
    .map(([server]) => server);
  const allowedServers = [...persistedServers];

  if (allowedServers.includes(url.hostname)) {
    return true;
  }

  const { allowed, dontAskAgain } = await askForJitsiCaptureScreenPermission(
    url
  );

  if (dontAskAgain) {
    dispatch({
      type: JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED,
      payload: {
        jitsiServer: url.hostname,
        allowed,
      },
    });
  }

  return allowed;
};
