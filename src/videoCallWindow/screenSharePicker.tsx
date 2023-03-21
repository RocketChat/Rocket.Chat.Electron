import { Box, Button, Icon, Margins, Scrollable } from '@rocket.chat/fuselage';
import {
  DesktopCapturer,
  DesktopCapturerSource,
  ipcRenderer,
  SourcesOptions,
} from 'electron';
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
            maxSize='x800'
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
      <Box alignSelf='center' display='flex'>
        <Button onClick={handleClose}>Cancel</Button>
      </Box>
    </Dialog>
  );
}
