import {
  Box,
  Button,
  Callout,
  Margins,
  Scrollable,
} from '@rocket.chat/fuselage';
import type {
  DesktopCapturer,
  DesktopCapturerSource,
  SourcesOptions,
} from 'electron';
import { ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

import { Dialog } from '../ui/components/Dialog';
import { Source } from '../ui/components/ScreenSharingDialog/styles';

const desktopCapturer: DesktopCapturer = {
  getSources: (opts: SourcesOptions) =>
    ipcRenderer.invoke('desktop-capturer-get-sources', [opts]),
};

export function ScreenSharePicker() {
  const [visible, setVisible] = useState(false);
  const [sources, setSources] = useState<DesktopCapturerSource[]>([]);
  const [
    isScreenRecordingPermissionGranted,
    setIsScreenRecordingPermissionGranted,
  ] = useState(false);

  const fetchSources = async (): Promise<void> => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
    });
    const filteredSources = sources.filter(
      (source) => source.thumbnail.isEmpty() === false
    );
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
    }, 2000);

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

  return (
    <Dialog isVisible={visible} onClose={handleClose}>
      <Box
        display='flex'
        flexWrap='wrap'
        alignItems='stretch'
        justifyContent='center'
        maxWidth='x800'
      >
        {!isScreenRecordingPermissionGranted && (
          <Box alignSelf='center' display='flex'>
            <Callout
              title='Screen Recording Permissions Denied'
              type='danger'
              maxWidth='100%'
            >
              The screen sharing feature requires screen recording permissions
              to be granted. Please grant screen recording permissions in your
              system settings and try again.
              <br />
              Open <b>System Preferences</b> -<b> Security & Privacy</b> -
              <b> Screen Recording</b> and check
              <b> Rocket.Chat</b>
            </Callout>
          </Box>
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
                <Source
                  display='flex'
                  flexDirection='column'
                  onClick={handleScreenSharingSourceClick(id)}
                >
                  <Box
                    flexGrow={1}
                    display='flex'
                    alignItems='center'
                    justifyContent='center'
                  >
                    <Box
                      is='img'
                      src={thumbnail.toDataURL()}
                      alt={name}
                      style={{ maxWidth: '148px', maxHeight: '148px' }}
                    />
                  </Box>
                  <Box>{name}</Box>
                </Source>
              ))}
            </Box>
          </Margins>
        </Scrollable>
      </Box>
      <Box alignSelf='center' display='flex'>
        <Button onClick={handleClose}>Cancel</Button>
      </Box>
    </Dialog>
  );
}
