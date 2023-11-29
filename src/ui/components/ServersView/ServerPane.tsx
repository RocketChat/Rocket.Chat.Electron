import type { FC } from 'react';
import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  WEBVIEW_ATTACHED,
  WEBVIEW_READY,
} from '../../actions';
import ErrorView from './ErrorView';
import UnsupportedServer from './UnsupportedServer';
import { StyledWebView, Wrapper } from './styles';

type ServerPaneProps = {
  lastPath: string | undefined;
  serverUrl: string;
  isSelected: boolean;
  isFailed: boolean;
  isSupported: boolean | undefined;
  title: string | undefined;
};

export const ServerPane: FC<ServerPaneProps> = ({
  lastPath,
  serverUrl,
  isSelected,
  isFailed,
  isSupported,
}) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const webviewRef =
    useRef<ReturnType<(typeof document)['createElement']>>(null);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleWindowFocus = (): void => {
      if (!isSelected || isFailed) {
        return;
      }

      if (webview) webview.focus();
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
    let step = false;
    const addEventListenerOnce = (
      e: 'did-attach' | 'dom-ready',
      cb: () => void
    ): void => {
      const handler = () => {
        cb();
        webview.removeEventListener(e, handler);
      };
      webview.addEventListener(e, handler);
    };

    const handleAttachReady = (): void => {
      step &&
        setTimeout(() => {
          dispatch({
            type: WEBVIEW_READY,
            payload: {
              url: serverUrl,
              webContentsId: webview.getWebContentsId(),
            },
          });
        }, 300);
      step = true;
    };
    addEventListenerOnce('did-attach', handleAttachReady);
    addEventListenerOnce('dom-ready', handleAttachReady);

    return () => {
      webview.removeEventListener('did-attach', handleAttachReady);
      webview.removeEventListener('dom-ready', handleAttachReady);
    };
  }, [dispatch, serverUrl]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }
    const addEventListenerOnce = (e: 'did-attach', cb: () => void): void => {
      const handler = () => {
        cb();
        webview.removeEventListener(e, handler);
      };
      webview.addEventListener(e, handler);
    };

    const handleAttachReady = (): void => {
      setTimeout(() => {
        dispatch({
          type: WEBVIEW_ATTACHED,
          payload: {
            url: serverUrl,
            webContentsId: webview.getWebContentsId(),
          },
        });
      }, 300);
    };

    addEventListenerOnce('did-attach', handleAttachReady);

    return () => {
      webview.removeEventListener('did-attach', handleAttachReady);
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

  useEffect(() => {
    const webview = webviewRef.current;
    if (isSelected) {
      setTimeout(() => {
        webview?.focus();
      }, 100);
    } else {
      webview?.blur();
    }
  }, [isSelected]);

  return (
    <Wrapper isVisible={isSelected}>
      <StyledWebView
        ref={webviewRef}
        isFailed={isFailed}
        partition={`persist:${serverUrl}`}
        {...({ allowpopups: 'allowpopups' } as any)}
      />{' '}
      <UnsupportedServer
        isSupported={isSupported}
        instanceDomain={new URL(serverUrl).hostname}
      />
      <ErrorView isFailed={isFailed} onReload={handleReload} />
    </Wrapper>
  );
};
