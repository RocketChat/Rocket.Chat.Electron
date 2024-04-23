import { Box, IconButton, Throbber } from '@rocket.chat/fuselage';
import { useDarkMode } from '@rocket.chat/fuselage-hooks';
import { useEffect, useState } from 'react';

const DocumentViewer = ({
  url,
  partition,
  closeDocumentViewer,
  themeAppearance,
}: {
  url: string;
  partition: string;
  themeAppearance: string | undefined;
  closeDocumentViewer: () => void;
}) => {
  const [documentUrl, setDocumentUrl] = useState('');

  const theme = useDarkMode(
    themeAppearance === 'auto' ? undefined : themeAppearance === 'dark'
  )
    ? 'dark'
    : 'light';

  useEffect(() => {
    if (documentUrl !== url && url !== '') {
      setDocumentUrl('about:blank');
      setTimeout(() => {
        setDocumentUrl(url);
      }, 100);
    }
  }, [url, documentUrl]);
  return (
    <>
      <Box
        bg={theme}
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
          color={theme === 'dark' ? 'font-white' : 'font-text'}
        >
          <IconButton
            icon='arrow-back'
            onClick={closeDocumentViewer}
            mi='x8'
            color={theme === 'dark' ? 'white' : 'default'}
          />
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
          >
            <Throbber
              size='x16'
              color={theme === 'dark' ? 'white' : 'default'}
            />
          </Box>
          <webview
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
