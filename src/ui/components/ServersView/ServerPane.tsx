import { WebviewTag } from 'electron';
import React, { useRef, useEffect, FC } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { RootAction } from '../../../store/actions';
import { LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED, WEBVIEW_ATTACHED } from '../../actions';
import ErrorView from './ErrorView';
import { StyledWebView, Wrapper } from './styles';

type ServerPaneProps = {
  lastPath: string;
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
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const webviewRef = useRef<WebviewTag>();

  useEffect(() => {
    const handleWindowFocus = (): void => {
      if (!isSelected || isFailed) {
        return;
      }

      webviewRef.current.focus();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isFailed, isSelected, serverUrl]);

  useEffect(() => {
    const webview = webviewRef.current;

    const handleDidAttach = (): void => {
      dispatch({
        type: WEBVIEW_ATTACHED,
        payload: {
          url: serverUrl,
          webContentsId: webview.getWebContentsId(),
        },
      });
    };

    webview.addEventListener('did-attach', handleDidAttach);

    return () => {
      webview.removeEventListener('did-attach', handleDidAttach);
    };
  }, [dispatch, serverUrl]);

  useEffect(() => {
    if (!webviewRef.current.src) {
      webviewRef.current.src = lastPath || serverUrl;
    }
  }, [lastPath, serverUrl]);

  const handleReload = (): void => {
    dispatch({
      type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
      payload: { url: serverUrl },
    });
  };

  return <Wrapper isVisible={isSelected}>
    <StyledWebView ref={webviewRef} isFailed={isFailed} partition={`persist:${ serverUrl }`} />
    <ErrorView isFailed={isFailed} onReload={handleReload} />
  </Wrapper>;
};
