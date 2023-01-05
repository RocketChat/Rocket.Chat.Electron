import { Box, Margins, Scrollable } from '@rocket.chat/fuselage';
import { DesktopCapturerSource, ipcRenderer } from 'electron';
import React, { useEffect, useState } from 'react';

import { desktopCapturer } from '../jitsi/preload';
import { Dialog } from '../ui/components/Dialog';
import { Source } from '../ui/components/ScreenSharingDialog/styles';

let isVisible = true;

export function ScreenSharePicker() {
  const [sources, setSources] = useState<DesktopCapturerSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | undefined>();

  useEffect(() => {
    ipcRenderer.on('video-call-window/open-screen-picker', () => {
      console.log('isVisible', isVisible);
      console.log('video-call-window/open-screen-picker');
      isVisible = true;
      console.log('isVisible', isVisible);
    });
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const fetchSources = async (): Promise<void> => {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
      });
      setSources(sources);
    };

    const timer = setInterval(() => {
      fetchSources();
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isVisible]);

  useEffect(() => {
    const timer = setInterval(() => {
      ipcRenderer.send(
        'video-call-window/screen-sharing-source-responded',
        selectedSource
      );
      console.log('selectedSource', selectedSource);
    }, 2000);

    return () => {
      clearInterval(timer);
    };
  }, [selectedSource]);

  const handleScreenSharingSourceClick = (id: string) => () => {
    // dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED, payload: id });
    console.log('handleScreenSharingSourceClick', id);
    setSelectedSource(id);
    // isVisible = false;
    // ipcRenderer.send(
    //   'video-call-window/screen-sharing-source-responded',
    //   'screen:1:0'
    // );
    // ipcRenderer.invoke('video-call-window/screen-sharing-source-responded', id);
  };

  const handleClose = (): void => {
    isVisible = false;
    console.log('handleClose');
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box fontScale='h1' alignSelf='center'>
        Select a screen to share
      </Box>
      <Box
        display='flex'
        flexWrap='wrap'
        alignItems='stretch'
        justifyContent='center'
      >
        <Margins all='x8'>
          {sources.map(({ id, name, thumbnail }) => (
            <Scrollable key={id}>
              <Source
                display='flex'
                flexDirection='column'
                onClick={handleScreenSharingSourceClick(id)}
              >
                <Box flexGrow={1} display='flex' alignItems='center'>
                  <Box
                    is='img'
                    src={thumbnail.toDataURL()}
                    alt={name}
                    style={{ width: '100%' }}
                  />
                </Box>
                <Box>{name}</Box>
              </Source>
            </Scrollable>
          ))}
        </Margins>
      </Box>
    </Dialog>
  );
}
