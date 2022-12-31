import { dispatch, select } from '../store';
import { askForJitsiCaptureScreenPermission } from '../ui/main/dialogs';
import { JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED } from './actions';

export const isJitsiServerAllowed = async (
  rawUrl: string
): Promise<{
  allowed: boolean;
  dontAskAgain: boolean;
}> => {
  const url = new URL(rawUrl);

  const persistedServers = Object.entries(
    select(({ allowedJitsiServers }) => allowedJitsiServers)
  ).filter(([key]) => key === url.host);

  if (persistedServers.length) {
    return { allowed: persistedServers[0][1], dontAskAgain: true };
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

  return { allowed, dontAskAgain };
};
