import {
  Box,
  Button,
  Callout,
  Label,
  PaletteStyleTag,
  Tabs,
} from '@rocket.chat/fuselage';
import type {
  DesktopCapturer,
  DesktopCapturerSource,
  SourcesOptions,
} from 'electron';
import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';

import { Dialog } from '../ui/components/Dialog';

const desktopCapturer: DesktopCapturer = {
  getSources: (opts: SourcesOptions) =>
    ipcRenderer.invoke('desktop-capturer-get-sources', [opts]),
};

export function ScreenSharePicker() {
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
    <Box>
      <PaletteStyleTag theme='light' selector=':root' />
      <Dialog isVisible={visible} onClose={handleClose}>
        <Box flexDirection='column'>
          {!isScreenRecordingPermissionGranted && (
            <Callout
              title='Screen Recording Permissions Denied'
              type='danger'
              marginBlockEnd='x16'
            >
              The screen sharing feature requires screen recording permissions
              to be granted. Please grant screen recording permissions in your
              system settings and try again.
              <br />
              Open <b>System Preferences</b> -<b> Security & Privacy</b> -
              <b> Screen Recording</b> and check
              <b> Rocket.Chat</b>
            </Callout>
          )}

          <Box fontScale='h1' mb='x16'>
            Share your screen
          </Box>

          <Tabs>
            <Tabs.Item
              selected={currentTab === 'screen'}
              onClick={() => setCurrentTab('screen')}
            >
              Your entire screen
            </Tabs.Item>
            <Tabs.Item
              selected={currentTab === 'window'}
              onClick={() => setCurrentTab('window')}
            >
              Application window
            </Tabs.Item>
          </Tabs>

          <Box m='x24'>
            {filteredSources.length === 0 ? (
              <Box
                display='flex'
                alignItems='center'
                justifyContent='center'
                width='100%'
              >
                <Label>
                  No {currentTab === 'screen' ? 'screens' : 'windows'} found
                </Label>
              </Box>
            ) : (
              <Box display='flex' flexWrap='wrap'>
                {filteredSources.map(({ id, name, thumbnail }) => (
                  <Box
                    key={id}
                    width='x180'
                    height='x140'
                    m='x8'
                    overflow='hidden'
                    display='flex'
                    flexDirection='column'
                    onClick={handleScreenSharingSourceClick(id)}
                    bg={
                      selectedSourceId === id
                        ? 'selection-background'
                        : 'surface-light'
                    }
                    color={selectedSourceId === id ? 'primary' : 'default'}
                    border='1px solid var(--rcx-color-stroke-light)'
                    borderRadius='x2'
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
                ))}
              </Box>
            )}
          </Box>

          <Box
            display='flex'
            justifyContent='space-between'
            marginBlockStart='x16'
          >
            <Button onClick={handleClose}>Cancel</Button>
            <Button primary onClick={handleShare} disabled={!selectedSourceId}>
              Share
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
