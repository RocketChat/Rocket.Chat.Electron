import { Box, IconButton } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';

import MarkdownContent from './MarkdownContent';
import PdfContent from './PdfContent';

const DocumentViewer = ({
  url,
  format,
  partition,
  filename,
  isEncrypted,
  closeDocumentViewer,
}: {
  url: string;
  format?: string;
  partition: string;
  filename?: string;
  isEncrypted?: boolean;
  closeDocumentViewer: () => void;
}) => {
  const { t } = useTranslation();
  const isMarkdown = format === 'markdown';
  const title = isMarkdown
    ? t('documentViewer.title.markdown')
    : t('documentViewer.title.pdf');

  const handleDownload = async () => {
    // Extract serverUrl from partition string: "persist:https://server.com"
    const serverUrl = partition.replace(/^persist:/, '');
    await ipcRenderer.invoke(
      'document-viewer/download-encrypted',
      serverUrl,
      url,
      filename ?? 'document.pdf'
    );
  };

  return (
    <Box
      bg='tint'
      width='100%'
      height='100%'
      display='flex'
      flexDirection='column'
    >
      <Box
        display='flex'
        alignItems='center'
        color='default'
        pbe='x8'
        pbs='x8'
        pis='x8'
      >
        <IconButton
          icon='arrow-back'
          onClick={closeDocumentViewer}
          mi='x8'
          aria-label={t('documentViewer.back')}
        />
        <Box is='h2' fontScale='h2' m='none'>
          {title}
        </Box>
        {isEncrypted && (
          <IconButton
            icon='download'
            onClick={handleDownload}
            mi='x8'
            aria-label={t('documentViewer.download')}
          />
        )}
      </Box>

      {isMarkdown ? (
        <Box position='relative' flexGrow={1}>
          <MarkdownContent url={url} partition={partition} />
        </Box>
      ) : (
        <PdfContent url={url} partition={partition} />
      )}
    </Box>
  );
};

export default DocumentViewer;
