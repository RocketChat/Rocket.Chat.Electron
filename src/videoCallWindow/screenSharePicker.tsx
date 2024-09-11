import {
  Box,
  Button,
  Callout,
  Label,
  Margins,
  PaletteStyleTag,
  Scrollable,
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
    setVisible(false);
    ipcRenderer.send('video-call-window/screen-sharing-source-responded', id);
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

  return (
    <Box>
      <PaletteStyleTag
        theme='light'
        selector=':root'
        // tagId='sidebar-palette'
      />
      <Dialog isVisible={visible} onClose={handleClose}>
        <Box
          display='flex'
          flexWrap='wrap'
          alignItems='stretch'
          justifyContent='center'
          maxWidth='x800'
          // bg='tint'
          borderRadius='x16'
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
          <Box alignSelf='center' display='flex'>
            <Box fontScale='h1' alignSelf='left'>
              Select a screen to share
            </Box>
          </Box>
          <Scrollable>
            <Margins blockStart='x16' blockEnd='x16'>
              <Box
                display='flex'
                flexWrap='wrap'
                alignItems='stretch'
                justifyContent='center'
                maxSize='x730'
              >
                {sources.map(({ id, name, thumbnail }) => (
                  <Box
                    width='x160'
                    height='x200'
                    key={id}
                    display='flex'
                    flexDirection='column'
                    onClick={handleScreenSharingSourceClick(id)}
                    // bg='tint'
                    margin='x8'
                    // borderRadius='x8'
                    onMouseEnter={() => handleMouseEnter(id)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      cursor: 'pointer',
                    }}
                    borderRadius='x8'
                    border={
                      hoveredSourceId === id
                        ? '2px solid var(--rcx-color-stroke-light)'
                        : '2px solid transparent'
                    }
                  >
                    <Box
                      flexGrow={1}
                      display='flex'
                      alignItems='center'
                      justifyContent='center'
                      content='center'
                    >
                      <Box
                        is='img'
                        src={thumbnail.toDataURL()}
                        alt={name}
                        style={{ maxWidth: '148px', maxHeight: '148px' }}
                        borderRadius='x2'
                      />
                    </Box>
                    <Label margin='x8' withTruncatedText>
                      {name}
                    </Label>
                  </Box>
                ))}
              </Box>
            </Margins>
          </Scrollable>
        </Box>
        <Box alignSelf='center' display='flex' marginBlockStart='x24'>
          <Button onClick={handleClose}>Cancel</Button>
        </Box>
      </Dialog>
    </Box>
  );
}
