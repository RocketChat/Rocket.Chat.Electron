import { Box, Icon, IconButton } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../ipc/renderer';
import MarkdownContent from '../ui/components/ServersView/MarkdownContent';
import PdfContent from '../ui/components/ServersView/PdfContent';
import TooltipProvider from '../ui/components/utils/TooltipProvider';
import { formatServerTitle } from '../ui/components/utils/formatServerTitle';
import { WindowToolbar } from '../ui/windowChrome/WindowToolbar';
import type { PaletteTheme } from '../ui/windowChrome/appearance';
import { getCardStyle, resolveSurfaces } from '../ui/windowChrome/appearance';
import { WindowChromeGlobalStyles } from '../ui/windowChrome/styles';
import { useTransparency } from '../ui/windowChrome/useTransparency';
import { DOCUMENT_CHANNEL, TRANSPARENCY_CHANNEL } from './constants';
import type { DocumentDescriptor } from './document';
import { readInitialDocument } from './document';

type DocumentViewerWindowProps = {
  paletteTheme: PaletteTheme;
};

export const DocumentViewerWindow = ({
  paletteTheme,
}: DocumentViewerWindowProps) => {
  const { t } = useTranslation();
  const isTransparent = useTransparency(TRANSPARENCY_CHANNEL);
  const surfaces = useMemo(
    () => resolveSurfaces(paletteTheme, isTransparent),
    [paletteTheme, isTransparent]
  );
  const cardStyle = useMemo(
    () => getCardStyle(paletteTheme, surfaces),
    [paletteTheme, surfaces]
  );

  const [document, setDocument] =
    useState<DocumentDescriptor>(readInitialDocument);
  const [isRaw, setIsRaw] = useState(false);

  // The window is reused for the next document rather than reopened, so the
  // main process hands it over here.
  useEffect(() => {
    const handleDocument = (
      _event: unknown,
      next: DocumentDescriptor
    ): void => {
      setDocument(next);
      // A new document is rendered, whatever the previous one was showing.
      setIsRaw(false);
    };

    ipcRenderer.on(DOCUMENT_CHANNEL, handleDocument);
    return () => {
      ipcRenderer.off(DOCUMENT_CHANNEL, handleDocument);
    };
  }, []);

  const handleDownload = useCallback(() => {
    invoke('document-viewer-window/save-document', {
      url: document.url,
      partition: document.partition,
      server: document.server,
      format: document.format,
    });
  }, [document]);

  const handleToggleRaw = useCallback(() => {
    setIsRaw((current) => !current);
  }, []);

  const isMarkdown = document.format === 'markdown';
  const title = isMarkdown
    ? t('documentViewer.title.markdown')
    : t('documentViewer.title.pdf');
  const serverLabel = document.server
    ? formatServerTitle(document.server)
    : undefined;

  return (
    <TooltipProvider>
      <WindowChromeGlobalStyles
        paletteTheme={paletteTheme}
        surfaces={surfaces}
      />
      <Box
        display='flex'
        flexDirection='column'
        height='100vh'
        width='100%'
        style={{ backgroundColor: surfaces.panel }}
      >
        <WindowToolbar
          actions={
            <>
              {isMarkdown && (
                <IconButton
                  small
                  icon={isRaw ? 'eye' : 'code'}
                  title={
                    isRaw
                      ? t('documentViewer.viewRendered')
                      : t('documentViewer.viewSource')
                  }
                  aria-label={
                    isRaw
                      ? t('documentViewer.viewRendered')
                      : t('documentViewer.viewSource')
                  }
                  aria-pressed={isRaw}
                  onClick={handleToggleRaw}
                />
              )}
              <IconButton
                small
                icon='download'
                title={t('documentViewer.download')}
                aria-label={t('documentViewer.download')}
                onClick={handleDownload}
              />
            </>
          }
        >
          <Icon name={isMarkdown ? 'file-document' : 'file-pdf'} size='x16' />
          <Box
            marginInlineStart='x4'
            fontScale='p2b'
            color='default'
            withTruncatedText
          >
            {title}
          </Box>
          {serverLabel && (
            <Box
              marginInlineStart='x8'
              fontScale='c1'
              color='annotation'
              withTruncatedText
            >
              {serverLabel}
            </Box>
          )}
        </WindowToolbar>

        <Box
          flexGrow={1}
          display='flex'
          flexDirection='column'
          style={{ minWidth: 0, minHeight: 0, ...cardStyle }}
        >
          {/*
            Keyed on the document so a second file replaces the first outright:
            both viewers hold a webview that would otherwise keep the previous
            document's session and scroll position.
          */}
          {isMarkdown ? (
            <Box position='relative' flexGrow={1}>
              <MarkdownContent
                key={document.url}
                url={document.url}
                partition={document.partition}
                isRaw={isRaw}
              />
            </Box>
          ) : (
            <PdfContent
              key={document.url}
              url={document.url}
              partition={document.partition}
            />
          )}
        </Box>
      </Box>
    </TooltipProvider>
  );
};
