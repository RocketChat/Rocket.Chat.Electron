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
import { useEffect, useState } from 'react';
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

  const fetchSources = async (): Promise<void> => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
    });
    const filteredSources = sources
      .filter((source) => !source.thumbnail.isEmpty())
      .sort((a, b) => a.name.localeCompare(b.name));
    if (filteredSources.length === 0) return;
    setSources(filteredSources);
  };

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
  }, []);

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
  }, [visible]);

  const handleScreenSharingSourceClick = (id: string) => () => {
    setSelectedSourceId(id);
  };

  const handleShare = (): void => {
    if (selectedSourceId) {
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
          padding='x24'
          display='flex'
          flexDirection='column'
          height='560px'
          backgroundColor='surface'
          color='default'
        >
          <Box mb='x16'>
            <Box fontScale='h1' mb='x16'>
              {t('screenSharing.title')}
            </Box>

            <Tabs marginBlockEnd='x16'>
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
                <Box display='flex' flexWrap='wrap' justifyContent='flex-start'>
                  {filteredSources.length === 0 ? (
                    <Box
                      display='flex'
                      alignItems='center'
                      justifyContent='center'
                      width='100%'
                      p='x16'
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
                        width='x180'
                        height='x140'
                        m='x8'
                        overflow='hidden'
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
                      >
                        <Box
                          flexGrow={1}
                          display='flex'
                          alignItems='center'
                          justifyContent='center'
                          overflow='hidden'
                        >
                          <Box
                            is='img'
                            src={thumbnail.toDataURL()}
                            alt={name}
                            width='100%'
                            height='auto'
                          />
                        </Box>
                        <Box p='x4'>
                          <Label>{name}</Label>
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
