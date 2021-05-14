import { Box, Margins, Scrollable } from '@rocket.chat/fuselage';
import { desktopCapturer, DesktopCapturerSource } from 'electron';
import React, { useEffect, useState, FC } from 'react';
import { useTranslation } from 'react-i18next';

import { SCREEN_SHARING_DIALOG_DISMISSED } from '../../../common/actions/screenSharingActions';
import { WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED } from '../../../common/actions/uiActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { Dialog } from '../Dialog';
import { Source } from './styles';

export const ScreenSharingDialog: FC = () => {
  const openDialog = useAppSelector(({ openDialog }) => openDialog);
  const isVisible = openDialog === 'screen-sharing';
  const dispatch = useAppDispatch();

  const { t } = useTranslation();

  const [sources, setSources] = useState<DesktopCapturerSource[]>([]);

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

  const handleScreenSharingSourceClick = (id: string) => () => {
    dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED, payload: id });
  };

  const handleClose = (): void => {
    dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box fontScale='h1' alignSelf='center'>
        {t('dialog.screenshare.announcement')}
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
};
