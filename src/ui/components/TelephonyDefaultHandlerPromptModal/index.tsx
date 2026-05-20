import { Box, Button, ButtonGroup } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import {
  TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
  TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
} from '../../actions';
import { Dialog } from '../Dialog';

export const TelephonyDefaultHandlerPromptModal = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const isVisible = useSelector(
    ({ dialogs }: RootState) =>
      dialogs?.telephonyDefaultHandlerPrompt?.isOpen ?? false
  );

  const handleClose = () => {
    dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE });
  };

  const handleOpenSettings = () => {
    dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED });
    dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE });
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box width='x480' display='flex' flexDirection='column'>
        <Box fontScale='h3' marginBlockEnd='x4'>
          {t('telephony.defaultHandlerPrompt.title')}
        </Box>
        <Box fontScale='p2' marginBlockEnd='x4'>
          {t('telephony.defaultHandlerPrompt.body')}
        </Box>
        {process.platform !== 'darwin' && (
          <Box fontScale='p2' marginBlockEnd='x12'>
            {t('telephony.defaultHandlerPrompt.body2')}
          </Box>
        )}
        <ButtonGroup stretch>
          {process.platform !== 'darwin' && (
            <Button primary onClick={handleOpenSettings}>
              {t('telephony.defaultHandlerPrompt.openSettings')}
            </Button>
          )}
          <Button primary={process.platform === 'darwin'} onClick={handleClose}>
            {t('telephony.defaultHandlerPrompt.dismiss')}
          </Button>
        </ButtonGroup>
      </Box>
    </Dialog>
  );
};
