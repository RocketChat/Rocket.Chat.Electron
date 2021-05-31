import type { WebContents } from 'electron';
import { useEffect } from 'react';

import * as serverActions from '../../../common/actions/serverActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';

export const useNavigationEvents = (
  guestWebContents: WebContents | undefined
): void => {
  const serverUrl = useAppSelector(
    (state) =>
      state.servers.find(
        (server) => server.webContentsId === guestWebContents?.id
      )?.url
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!guestWebContents || !serverUrl) {
      return;
    }

    const handleDidStartLoading = (): void => {
      dispatch(serverActions.loading(serverUrl));
    };

    guestWebContents.on('did-start-loading', handleDidStartLoading);

    return () => {
      guestWebContents.off('did-start-loading', handleDidStartLoading);
    };
  }, [dispatch, guestWebContents, serverUrl]);

  useEffect(() => {
    if (!guestWebContents || !serverUrl) {
      return;
    }

    const handleDidFailLoad = (
      _event: Event,
      errorCode: number,
      _errorDescription: string,
      _validatedURL: string,
      isMainFrame: boolean
    ): void => {
      if (errorCode === -3) {
        console.warn(
          'Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004'
        );
        return;
      }

      if (isMainFrame) {
        dispatch(serverActions.failedToLoad(serverUrl));
      }
    };

    guestWebContents.on('did-fail-load', handleDidFailLoad);

    return () => {
      guestWebContents.off('did-fail-load', handleDidFailLoad);
    };
  }, [dispatch, guestWebContents, serverUrl]);

  useEffect(() => {
    if (!guestWebContents || !serverUrl) {
      return;
    }

    const handleDidNavigateInPage = (_event: Event, pageUrl: string): void => {
      const rootUrl = new URL(serverUrl);
      const url = new URL(pageUrl, serverUrl);

      if (rootUrl.host !== url.host) {
        return;
      }

      dispatch(
        serverActions.pathChanged(
          serverUrl,
          url.pathname + url.search + url.hash
        )
      );
    };

    guestWebContents.on('did-navigate-in-page', handleDidNavigateInPage);

    return () => {
      guestWebContents.off('did-navigate-in-page', handleDidNavigateInPage);
    };
  }, [dispatch, guestWebContents, serverUrl]);

  useEffect(
    () => () => {
      guestWebContents?.session.flushStorageData();
    },
    [guestWebContents]
  );
};
