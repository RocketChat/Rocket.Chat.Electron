import {
  Box,
  Button,
  Callout,
  Label,
  PaletteStyleTag,
  Scrollable,
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
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);
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

  const handleMouseEnter = (id: string) => {
    setHoveredSourceId(id);
  };

  const handleMouseLeave = () => {
    setHoveredSourceId(null);
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
        <Box
          display='flex'
          flexDirection='column'
          bg='surface'
          width='x640'
          height='x480'
          color='default'
        >
          {!isScreenRecordingPermissionGranted && (
            <Callout
              title='Screen Recording Permissions Denied'
              type='danger'
              maxWidth='100%'
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

          <Box fontScale='h1' color='default' pi='x24' pb='x16'>
            Compartilhar sua tela
          </Box>

          <Tabs>
            <Tabs.Item
              selected={currentTab === 'screen'}
              onClick={() => setCurrentTab('screen')}
            >
              Toda sua tela
            </Tabs.Item>
            <Tabs.Item
              selected={currentTab === 'window'}
              onClick={() => setCurrentTab('window')}
            >
              Janela de aplicativo
            </Tabs.Item>
          </Tabs>

          <Box
            display='flex'
            flexDirection='column'
            flexGrow={1}
            overflow='hidden'
            position='relative'
            style={{ minHeight: '250px' }}
          >
            <Scrollable vertical>
              <Box
                display='flex'
                flexWrap='wrap'
                style={{ gap: '16px' }}
                p='x16'
                pb='x24'
              >
                {filteredSources.length === 0 ? (
                  <Box
                    display='flex'
                    alignItems='center'
                    justifyContent='center'
                    height='x200'
                    width='100%'
                  >
                    <Label>
                      No {currentTab === 'screen' ? 'screens' : 'windows'} found
                    </Label>
                  </Box>
                ) : (
                  filteredSources.map(({ id, name, thumbnail }) => (
                    <Box
                      key={id}
                      width='x180'
                      height='x140'
                      overflow='hidden'
                      display='flex'
                      flexDirection='column'
                      onClick={handleScreenSharingSourceClick(id)}
                      onMouseEnter={() => handleMouseEnter(id)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        cursor: 'pointer',
                      }}
                      border={
                        selectedSourceId === id
                          ? '2px solid #1D74F5'
                          : hoveredSourceId === id
                            ? '1px solid var(--rcx-color-stroke-light)'
                            : '1px solid var(--rcx-color-stroke-extra-light)'
                      }
                      borderRadius='x2'
                    >
                      <Box
                        flexGrow={1}
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        bg='surface-tint'
                        overflow='hidden'
                      >
                        <Box
                          is='img'
                          src={thumbnail.toDataURL()}
                          alt={name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      </Box>
                      <Box
                        p='x4'
                        fontSize='c1'
                        color='hint'
                        lineHeight='1.2'
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {name}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            </Scrollable>
          </Box>

          <Box
            display='flex'
            justifyContent='space-between'
            p='x16'
            border='1px solid var(--rcx-color-stroke-extra-light) none none none'
          >
            <Button onClick={handleClose}>Cancelar</Button>
            <Button primary onClick={handleShare} disabled={!selectedSourceId}>
              Compartilhar
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
