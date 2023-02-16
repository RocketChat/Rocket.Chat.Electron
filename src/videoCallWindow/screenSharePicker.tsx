import { Box, Margins, Scrollable } from '@rocket.chat/fuselage';
import { DesktopCapturer, DesktopCapturerSource, ipcRenderer, SourcesOptions } from 'electron';
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

  const fetchSources = async (): Promise<void> => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
    });
    setSources(sources);
  };

  fetchSources();

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
    }, 1000);

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
