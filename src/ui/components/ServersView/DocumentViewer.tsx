import { Box, IconButton } from '@rocket.chat/fuselage';

const DocumentViewer = ({
  url,
  partition,
  closeDocumentViewer,
}: {
  url: string;
  partition: string;
  closeDocumentViewer: () => void;
}) => {
  return (
    <>
      <Box
        bg='light'
        width='100%'
        height='100%'
        position='absolute'
        content='center'
        alignItems='center'
      >
        <Box content='center' alignItems='center' display='flex'>
          <IconButton icon='arrow-back' onClick={closeDocumentViewer} mi='x8' />
          <h2>PDF Viewer</h2>
        </Box>

        <Box>
          <webview
            src={url}
            style={{
              width: '100%',
              height: '100%',
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
