import type { FoundInPageEvent } from 'electron';
import { ipcRenderer } from 'electron';
import { useRef, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import { listen } from '../../../store';
import type { RootAction } from '../../../store/actions';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  MENU_BAR_FIND_IN_PAGE_CLICKED,
  WEBVIEW_ATTACHED,
  WEBVIEW_READY,
} from '../../actions';
import { getServerPanelId, getServerTabId } from '../utils/getServerDomId';
import ErrorView from './ErrorView';
import { FindInPageBar } from './FindInPageBar';
import UnsupportedServer from './UnsupportedServer';
import { StyledWebView, Wrapper } from './styles';

type ServerPaneProps = {
  lastPath: string | undefined;
  serverUrl: string;
  isSelected: boolean;
  isFailed: boolean;
  isSupported: boolean | undefined;
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  title: string | undefined;
  userLoggedIn?: boolean;
  isTabPanel?: boolean;
};

export const ServerPane = ({
  lastPath,
  serverUrl,
  isSelected,
  isFailed,
  isSupported,
  supportedVersionsFetchState,
  userLoggedIn,
  isTabPanel = false,
}: ServerPaneProps) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const webviewRef =
    useRef<ReturnType<(typeof document)['createElement']>>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const [isFindBarOpen, setIsFindBarOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResult, setFindResult] = useState({
    activeMatchOrdinal: 0,
    matches: 0,
  });
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleWindowFocus = (): void => {
      if (!isSelected || isFailed || isFindBarOpen) {
        return;
      }

      if (webview) webview.focus();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isFailed, isSelected, isFindBarOpen, serverUrl]);

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

    const shouldLoad = isSelected || userLoggedIn !== false;

    if (!webview.src && shouldLoad) {
      webview.src = lastPath || serverUrl;
    }
  }, [lastPath, serverUrl, isSelected, userLoggedIn]);

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
    // setDocumentViewerActive(true);
  }, [isSelected]);

  useEffect(() => {
    const handleOnline = () => {
      ipcRenderer.invoke('refresh-supported-versions', serverUrl);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [serverUrl]);

  const closeFindBar = (): void => {
    const webview = webviewRef.current;
    try {
      webview?.stopFindInPage('clearSelection');
    } catch {
      // webview may not be attached; nothing to clear
    }
    setIsFindBarOpen(false);
    setFindQuery('');
    setFindResult({ activeMatchOrdinal: 0, matches: 0 });
    webview?.focus();
  };

  useEffect(() => {
    const unsubscribe = listen(MENU_BAR_FIND_IN_PAGE_CLICKED, () => {
      if (!isSelected || isFailed) {
        return;
      }

      setIsFindBarOpen(true);
      setFocusRequest((n) => n + 1);
    });

    return unsubscribe;
  }, [isSelected, isFailed]);

  useEffect(() => {
    if (!isFindBarOpen) {
      return;
    }

    const input = findInputRef.current;
    input?.focus();
    input?.select();

    const rafId = requestAnimationFrame(() => {
      if (document.activeElement !== input) {
        input?.focus();
        input?.select();
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isFindBarOpen, focusRequest]);

  useEffect(() => {
    if (!isSelected && isFindBarOpen) {
      closeFindBar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);

  useEffect(
    () => () => {
      const webview = webviewRef.current;
      try {
        webview?.stopFindInPage('clearSelection');
      } catch {
        // webview may not be attached; nothing to clear
      }
    },
    []
  );

  useEffect(() => {
    if (!isFindBarOpen) {
      return;
    }

    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    try {
      if (findQuery.length > 0) {
        webview.findInPage(findQuery, { findNext: true });
      } else {
        webview.stopFindInPage('clearSelection');
        setFindResult({ activeMatchOrdinal: 0, matches: 0 });
      }
    } catch {
      // webview may not be attached yet
    }
  }, [findQuery, isFindBarOpen]);

  useEffect(() => {
    if (!isFindBarOpen) {
      return;
    }

    const webview = webviewRef.current;
    if (!webview) {
      return;
    }

    const handleFoundInPage = (event: FoundInPageEvent): void => {
      setFindResult({
        activeMatchOrdinal: event.result.activeMatchOrdinal,
        matches: event.result.matches,
      });
    };

    webview.addEventListener('found-in-page', handleFoundInPage);

    return () => {
      webview.removeEventListener('found-in-page', handleFoundInPage);
    };
  }, [isFindBarOpen]);

  const handleFindNext = (): void => {
    const webview = webviewRef.current;
    if (!webview || findQuery.length === 0) {
      return;
    }
    try {
      webview.findInPage(findQuery, { forward: true, findNext: false });
    } catch {
      // webview may not be attached yet
    }
  };

  const handleFindPrevious = (): void => {
    const webview = webviewRef.current;
    if (!webview || findQuery.length === 0) {
      return;
    }
    try {
      webview.findInPage(findQuery, { forward: false, findNext: false });
    } catch {
      // webview may not be attached yet
    }
  };

  return (
    <Wrapper
      isVisible={isSelected}
      {...(isTabPanel && {
        'id': getServerPanelId(serverUrl),
        'role': 'tabpanel',
        'aria-labelledby': getServerTabId(serverUrl),
        'hidden': !isSelected,
      })}
    >
      <StyledWebView
        ref={webviewRef}
        isFailed={isFailed}
        partition={`persist:${serverUrl}`}
        {...({ allowpopups: 'allowpopups' } as any)}
      />{' '}
      <UnsupportedServer
        isSupported={isSupported}
        fetchState={supportedVersionsFetchState}
        instanceDomain={new URL(serverUrl).hostname}
        serverUrl={serverUrl}
      />
      <ErrorView isFailed={isFailed} onReload={handleReload} />
      {isFindBarOpen && !isFailed && (
        <FindInPageBar
          query={findQuery}
          onQueryChange={setFindQuery}
          activeMatchOrdinal={findResult.activeMatchOrdinal}
          matches={findResult.matches}
          onNext={handleFindNext}
          onPrevious={handleFindPrevious}
          onClose={closeFindBar}
          inputRef={findInputRef}
        />
      )}
    </Wrapper>
  );
};
