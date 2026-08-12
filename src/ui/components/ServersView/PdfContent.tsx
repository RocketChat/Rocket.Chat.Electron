import { Box, Throbber } from '@rocket.chat/fuselage';
import { useEffect, useRef, useState } from 'react';

import { dispatch } from '../../../store';
import { WEBVIEW_PDF_VIEWER_ATTACHED } from '../../actions';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface HTMLWebViewElement {
    getWebContentsId: () => number;
    executeJavaScript: (code: string) => Promise<any>;
  }
}

const PdfContent = ({ url, partition }: { url: string; partition: string }) => {
  const [documentUrl, setDocumentUrl] = useState('');
  const webviewRef = useRef<HTMLWebViewElement>(null);

  useEffect(() => {
    if (!url) {
      setDocumentUrl('');
      return;
    }

    setDocumentUrl('about:blank');
    const timeoutId = window.setTimeout(() => {
      setDocumentUrl(url);
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [url]);

  useEffect(() => {
    const webviewElement = webviewRef.current;

    if (webviewElement) {
      // `dom-ready` rather than `did-attach`: getWebContentsId() throws until
      // the guest document exists, so announcing the viewer on attach never
      // reached the main process — and with it, neither did the link
      // interception that depends on knowing this webview's id.
      let announcedWebContentsId: number | null = null;

      const handleDidFinishLoad = (): void => {
        webviewElement.executeJavaScript(`
            document.addEventListener('click', (event) => {
              const anchor = event.target instanceof Element ? event.target.closest('a') : null;
              if (anchor && anchor.href) {
                try {
                  const url = new URL(anchor.href, document.baseURI);
                  if (url.pathname.toLowerCase().endsWith('.pdf')) {
                    event.preventDefault();
                  }
                } catch {}
              }
            }, true);
          `);
      };

      const handleDomReady: () => void = () => {
        const webContentsId = webviewElement.getWebContentsId();

        // Fires again on every navigation inside the viewer; the id only
        // changes when the guest is replaced.
        if (announcedWebContentsId === webContentsId) return;
        announcedWebContentsId = webContentsId;

        dispatch({
          type: WEBVIEW_PDF_VIEWER_ATTACHED,
          payload: { WebContentsId: webContentsId },
        });
      };

      webviewElement.addEventListener('dom-ready', handleDomReady);
      webviewElement.addEventListener('did-finish-load', handleDidFinishLoad);

      return () => {
        webviewElement.removeEventListener('dom-ready', handleDomReady);
        webviewElement.removeEventListener(
          'did-finish-load',
          handleDidFinishLoad
        );
      };
    }
    return () => {};
  }, []);

  return (
    <Box position='relative' flexGrow={1}>
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100%'
        width='100%'
        position='absolute'
        color='default'
      >
        <Throbber size='x16' inheritColor />
      </Box>
      <webview
        ref={webviewRef}
        src={documentUrl}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}
        partition={partition}
      />
    </Box>
  );
};

export default PdfContent;
