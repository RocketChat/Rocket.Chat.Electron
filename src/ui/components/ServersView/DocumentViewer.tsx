import { Box, IconButton } from '@rocket.chat/fuselage';
import React, { useState, useEffect } from 'react';

const DynamicWebview = ({
  url,
  isActive,
  partition,
  closeDocumentViewer,
}: {
  url: string;
  isActive: boolean;
  partition: string;
  closeDocumentViewer: () => void;
}) => {
  const [webView, setWebView] = useState<JSX.Element | null>(null);

  useEffect(() => {
    if (isActive && url) {
      setWebView(
        <webview
          src={url}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 64,
            right: 0,
            bottom: 0,
          }}
          partition={partition}
        />
      );
    } else {
      setWebView(null);
    }
  }, [url, isActive, partition]);

  return (
    <>
      {isActive && (
        <Box
          bg='light'
          width='100%'
          height='100%'
          position='absolute'
          content='center'
          alignItems='center'
        >
          <Box padding={5} display='flex'>
            <IconButton icon='arrow-back' onClick={closeDocumentViewer} />
            <h2>PDF Viewer</h2>
          </Box>

          <div>{webView}</div>
        </Box>
      )}
    </>
  );
};

export default DynamicWebview;
