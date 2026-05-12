import { Box, CheckBox, Margins } from '@rocket.chat/fuselage';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import { TELEPHONY_SERVER_SELECT_CLOSE } from '../../actions';
import { Dialog } from '../Dialog';
import { ServerItem } from './ServerItem';

export const TelephonyServerSelectModal = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const isVisible = useSelector(
    ({ dialogs }: RootState) => dialogs?.telephonyServerSelect?.isOpen ?? false
  );

  const servers = useSelector(({ servers }: RootState) => servers);

  const [rememberChoice, setRememberChoice] = useState(false);

  const handleClose = () => {
    dispatch({ type: TELEPHONY_SERVER_SELECT_CLOSE, payload: null });
    setRememberChoice(false);
  };

  const handleServerClick = (serverUrl: string) => {
    dispatch({
      type: TELEPHONY_SERVER_SELECT_CLOSE,
      payload: { serverUrl, rememberChoice },
    });
    setRememberChoice(false);
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Margins block='x16'>
        <Box fontScale='h3' marginBlockEnd='x8'>
          {t('dialog.telephonySelectServer.title')}
        </Box>
        <Box fontScale='p2' color='hint' marginBlockEnd='x16'>
          {t('dialog.telephonySelectServer.message')}
        </Box>

        <Box
          display='flex'
          flexDirection='column'
          style={{ maxHeight: '300px', overflowY: 'auto' }}
        >
          {servers.map((server) => (
            <ServerItem
              key={server.url}
              url={server.url}
              title={server.title}
              favicon={server.favicon}
              onClick={() => handleServerClick(server.url)}
            />
          ))}
        </Box>

        <Box display='flex' alignItems='center' marginBlockStart='x16'>
          <CheckBox
            checked={rememberChoice}
            onChange={() => setRememberChoice(!rememberChoice)}
          />
          <Box
            is='label'
            fontScale='p2'
            marginInlineStart='x8'
            style={{ cursor: 'pointer' }}
            onClick={() => setRememberChoice(!rememberChoice)}
          >
            {t('dialog.telephonySelectServer.rememberChoice')}
          </Box>
        </Box>
      </Margins>
    </Dialog>
  );
};
