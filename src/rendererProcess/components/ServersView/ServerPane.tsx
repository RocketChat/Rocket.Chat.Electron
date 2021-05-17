import type { WebviewTag } from 'electron';
import React, { useRef, useEffect, FC } from 'react';

import * as serverActions from '../../../common/actions/serverActions';
import { LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED } from '../../../common/actions/uiActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import ErrorView from './ErrorView';
import { StyledWebView, Wrapper } from './styles';

type ServerPaneProps = {
  lastPath: string | undefined;
  serverUrl: string;
  isSelected: boolean;
  isFailed: boolean;
};

export const ServerPane: FC<ServerPaneProps> = ({
  lastPath,
  serverUrl,
  isSelected,
  isFailed,
}) => {
  const dispatch = useAppDispatch();

  const webviewRef = useRef<WebviewTag>(null);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleWindowFocus = (): void => {
      if (!isSelected || isFailed) {
        return;
      }

      webview.focus();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isFailed, isSelected, serverUrl]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleDidAttach = (): void => {
      dispatch(
        serverActions.webviewAttached(serverUrl, webview.getWebContentsId())
      );
    };

    webview.addEventListener('did-attach', handleDidAttach);

    return () => {
      webview.removeEventListener('did-attach', handleDidAttach);
    };
  }, [dispatch, serverUrl]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    if (!webview.src) {
      webview.src = lastPath || serverUrl;
    }
  }, [lastPath, serverUrl]);

  const handleReload = (): void => {
    dispatch({
      type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
      payload: { url: serverUrl },
    });
  };

  return (
    <Wrapper isVisible={isSelected}>
      <StyledWebView
        ref={webviewRef}
        isFailed={isFailed}
        partition={`persist:${serverUrl}`}
      />
      <ErrorView isFailed={isFailed} onReload={handleReload} />
    </Wrapper>
  );
};
