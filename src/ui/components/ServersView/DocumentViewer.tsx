import { Box, IconButton } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import MarkdownContent from './MarkdownContent';
import PdfContent from './PdfContent';

const DocumentViewer = ({
  url,
  format,
  partition,
  closeDocumentViewer,
}: {
  url: string;
  format?: string;
  partition: string;
  closeDocumentViewer: () => void;
}) => {
  const { t } = useTranslation();
  const isMarkdown = format === 'markdown';
  const title = isMarkdown
    ? t('documentViewer.title.markdown')
    : t('documentViewer.title.pdf');

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
