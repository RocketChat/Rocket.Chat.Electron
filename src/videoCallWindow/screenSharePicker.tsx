import {
  Box,
  Button,
  Callout,
  Label,
  Tabs,
  Scrollable,
  PaletteStyleTag,
} from '@rocket.chat/fuselage';
import type {
  DesktopCapturer,
  DesktopCapturerSource,
  SourcesOptions,
} from 'electron';
import { ipcRenderer } from 'electron';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '../ui/components/Dialog';

const desktopCapturer: DesktopCapturer = {
  getSources: (opts: SourcesOptions) =>
    ipcRenderer.invoke('desktop-capturer-get-sources', [opts]),
};

export function ScreenSharePicker() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [sources, setSources] = useState<DesktopCapturerSource[]>([]);
  const [currentTab, setCurrentTab] = useState<'screen' | 'window'>('screen');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [
    isScreenRecordingPermissionGranted,
    setIsScreenRecordingPermissionGranted,
  ] = useState(false);

  const fetchSources = useCallback(async (): Promise<void> => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
      });

      // Filter out sources that are not capturable
      const filteredSources = sources
        .filter((source) => {
          // Only check for basic validity - thumbnail validation is already done by IPC handler
          if (!source.name || source.name.trim() === '') {
            return false;
          }

          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setSources(filteredSources);

      // If the currently selected source is no longer available, clear the selection
      if (
        selectedSourceId &&
        !filteredSources.find((s) => s.id === selectedSourceId)
      ) {
        console.log(
          'Previously selected source no longer available, clearing selection'
        );
        setSelectedSourceId(null);
      }
    } catch (error) {
      console.error('Error fetching screen sharing sources:', error);
      setSources([]);
    }
  }, [selectedSourceId]);

  useEffect(() => {
    const checkScreenRecordingPermission = async () => {
      const result = await ipcRenderer.invoke(
        'video-call-window/screen-recording-is-permission-granted'
      );
      setIsScreenRecordingPermissionGranted(result);
    };

    checkScreenRecordingPermission().catch(console.error);
  }, [visible]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  useEffect(() => {
    ipcRenderer.on('video-call-window/open-screen-picker', () => {
      setVisible(true);
    });
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = setInterval(() => {
      fetchSources();
    }, 3000);

    return () => {
      clearInterval(timer);
    };
  }, [visible, fetchSources]);

  const handleScreenSharingSourceClick = (id: string) => () => {
    setSelectedSourceId(id);
  };

  const handleShare = (): void => {
    if (selectedSourceId) {
      // Validate that the selected source still exists in our current sources list
      const selectedSource = sources.find((s) => s.id === selectedSourceId);

      if (!selectedSource) {
        console.error('Selected source no longer available:', selectedSourceId);
        // Refresh sources and clear selection
        fetchSources();
        setSelectedSourceId(null);
        return;
      }

      // Additional validation before sharing
      if (selectedSource.thumbnail.isEmpty()) {
        console.error(
          'Selected source has empty thumbnail, cannot share:',
          selectedSourceId
        );
        setSelectedSourceId(null);
        return;
      }

      console.log('Sharing screen source:', {
        id: selectedSource.id,
        name: selectedSource.name,
      });

      setVisible(false);
      ipcRenderer.send(
        'video-call-window/screen-sharing-source-responded',
        selectedSourceId
      );
    }
  };

  const handleClose = (): void => {
    setVisible(false);
    ipcRenderer.send('video-call-window/screen-sharing-source-responded', null);
  };

  // Filter sources based on the current tab
  const filteredSources = sources.filter((source) => {
    if (currentTab === 'screen') {
      return source.id.includes('screen');
    }
    return source.id.includes('window');
  });

  return (
    <>
      <PaletteStyleTag theme='dark' selector=':root' />
      <Dialog isVisible={visible} onClose={handleClose}>
        <Box
          width='680px'
          margin='auto'
          display='flex'
          flexDirection='column'
          height='560px'
          backgroundColor='surface'
          color='default'
        >
          <Box marginBlockEnd='x12'>
            <Box fontScale='h1' marginBlockEnd='x12'>
              {t('screenSharing.title')}
            </Box>

            <Tabs>
              <Tabs.Item
                selected={currentTab === 'screen'}
                onClick={() => setCurrentTab('screen')}
              >
                {t('screenSharing.entireScreen')}
              </Tabs.Item>
              <Tabs.Item
                selected={currentTab === 'window'}
                onClick={() => setCurrentTab('window')}
              >
                {t('screenSharing.applicationWindow')}
              </Tabs.Item>
            </Tabs>
          </Box>
          <Box
            display='flex'
            flexDirection='column'
            overflow='hidden'
            marginBlockStart='x10'
            marginBlockEnd='x10'
            flexGrow={1}
          >
            {!isScreenRecordingPermissionGranted ? (
              <Callout
                title={t('screenSharing.permissionDenied')}
                type='danger'
                margin='x32'
              >
                {t('screenSharing.permissionRequired')}
                <br />
                {t('screenSharing.permissionInstructions')}
              </Callout>
            ) : (
              <Scrollable vertical>
                <Box
                  padding='x8'
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, 208px)',
                    gap: '16px',
                    justifyContent: 'center',
                  }}
                >
                  {filteredSources.length === 0 ? (
                    <Box
                      display='flex'
                      alignItems='center'
                      justifyContent='center'
                      width='100%'
                      p='x16'
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <Label>
                        {currentTab === 'screen'
                          ? t('screenSharing.noScreensFound')
                          : t('screenSharing.noWindowsFound')}
                      </Label>
                    </Box>
                  ) : (
                    filteredSources.map(({ id, name, thumbnail }) => (
                      <Box
                        key={id}
                        width='x208'
                        height='x170'
                        display='flex'
                        flexDirection='column'
                        onClick={handleScreenSharingSourceClick(id)}
                        bg={selectedSourceId === id ? 'selected' : 'light'}
                        color={selectedSourceId === id ? 'selected' : 'light'}
                        border={
                          selectedSourceId === id
                            ? '2px solid var(--rcx-color-stroke-highlight)'
                            : '1px solid var(--rcx-color-stroke-light)'
                        }
                        borderRadius='x2'
                        cursor='pointer'
                        className='screen-share-thumbnail'
                        style={{
                          position: 'relative',
                          overflow: 'visible',
                        }}
                      >
                        <Box
                          flexGrow={1}
                          display='flex'
                          alignItems='flex-start'
                          justifyContent='flex-start'
                          overflow='hidden'
                          style={{
                            minHeight: '120px',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <Box
                            is='img'
                            src={thumbnail.toDataURL()}
                            alt={name}
                            style={{
                              width: '100%',
                              height: 'auto',
                              objectFit: 'contain',
                              objectPosition: 'top',
                              display: 'block',
                            }}
                          />
                        </Box>
                        <Box
                          p='x4'
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 10,
                            minHeight: 'auto',
                          }}
                        >
                          <Label
                            title={name}
                            style={{
                              fontSize: '11px',
                              lineHeight: '1.2',
                              color: 'white',
                              textAlign: 'center',
                              width: '100%',
                              margin: 0,
                              wordBreak: 'break-word',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {name}
                          </Label>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Scrollable>
            )}
          </Box>
          <Box
            display='flex'
            justifyContent='space-between'
            marginBlockStart='auto'
          >
            <Button onClick={handleClose}>{t('screenSharing.cancel')}</Button>
            <Button primary onClick={handleShare} disabled={!selectedSourceId}>
              {t('screenSharing.share')}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
