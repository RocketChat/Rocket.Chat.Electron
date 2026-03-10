import { Box, IconButton, Throbber } from '@rocket.chat/fuselage';
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

const DocumentViewer = ({
  url,
  partition,
  closeDocumentViewer,
}: {
  url: string;
  partition: string;
  closeDocumentViewer: () => void;
}) => {
  const [documentUrl, setDocumentUrl] = useState('');
  const webviewRef = useRef<HTMLWebViewElement>(null);

  useEffect(() => {
    if (documentUrl !== url && url !== '') {
      setDocumentUrl('about:blank');
      setTimeout(() => {
        setDocumentUrl(url);
      }, 100);
    }
  }, [url, documentUrl]);

  useEffect(() => {
    const webviewElement = webviewRef.current;

    if (webviewElement) {
      const handleDidAttach: () => void = () => {
        const webContentsId = webviewElement.getWebContentsId();
        dispatch({
          type: WEBVIEW_PDF_VIEWER_ATTACHED,
          payload: { WebContentsId: webContentsId },
        });

        webviewElement.addEventListener('did-finish-load', () => {
          webviewElement.executeJavaScript(`
            document.addEventListener('click', (event) => {
              if (event.target.tagName === 'A' && event.target.href.endsWith('.pdf')) {
                event.preventDefault(); // Block PDF link navigation
              }
            }, true);
          `);
        });
      };

      webviewElement.addEventListener('did-attach', handleDidAttach);

      return () => {
        webviewElement.removeEventListener('did-attach', handleDidAttach);
      };
    }
    return () => {};
  }, []);

  return (
    <>
      <Box
        bg='tint'
        width='100%'
        height='100%'
        position='absolute'
        content='center'
        alignItems='center'
      >
        <Box
          content='center'
          alignItems='center'
          display='flex'
          color='default'
        >
          <IconButton icon='arrow-back' onClick={closeDocumentViewer} mi='x8' />
          <h2>PDF Viewer</h2>
        </Box>

        <Box>
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
              position: 'absolute',
              left: 0,
              top: 50,
              right: 0,
              bottom: 0,
            }}
            partition={partition}
          />
        </Box>
      </Box>
    </>
  );
};

export default DocumentViewer;
