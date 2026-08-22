import { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import { TAB_WEBVIEW_ATTACHED } from '../../actions';
import { StyledWebView, Wrapper } from '../ServersView/styles';

type TabWebViewProps = {
  url: string;
  serverUrl: string;
  isActive: boolean;
};

export const TabWebView = ({ url, serverUrl, isActive }: TabWebViewProps) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const webviewRef =
    useRef<ReturnType<(typeof document)['createElement']>>(null);

  useEffect(() => {
    const webView = webviewRef.current;
    if (!webView) return;
    if (!webView.src) {
      webView.src = url;
    }
  }, [url]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleDidAttach = (): void => {
      setTimeout(() => {
        dispatch({
          type: TAB_WEBVIEW_ATTACHED,
          payload: {
            url,
            serverUrl,
            webContentsId: webview.getWebContentsId(),
          },
        });
      }, 300);
    };

    webview.addEventListener('did-attach', handleDidAttach);

    return () => {
      webview.removeEventListener('did-attach', handleDidAttach);
    };
  }, [dispatch, url, serverUrl]);

  return (
    <Wrapper isVisible={isActive}>
      <StyledWebView
        ref={webviewRef}
        isFailed={false}
        partition={`persist:${serverUrl}`}
        {...({ allowpopups: 'allowpopups' } as any)}
      />
    </Wrapper>
  );
};
