import {
  Box,
  Button,
  ButtonGroup,
  Margins,
  Throbber,
} from '@rocket.chat/fuselage';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import { listen } from '../../../store';
import type { RootAction } from '../../../store/actions';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_DISMISSED,
  CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_TRIGGERED,
} from '../../actions';
import { Dialog } from '../Dialog';

export const ClearCacheDialog = () => {
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const [webContendId, setWebcontentId] = useState<number>();
  const [isVisible, setIsVisible] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const { t } = useTranslation();

  const clearingCacheState = (): void => {
    setClearingCache(true);
    setTimeout(() => {
      setIsVisible(false);
      setClearingCache(false);
    }, 2000);
  };

  const handleKeepButtonClick = (): void => {
    if (webContendId === undefined) return;
    dispatch({
      type: CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
      payload: webContendId,
    });
    clearingCacheState();
  };

  const handleDeleteButtonClick = (): void => {
    if (webContendId === undefined) return;
    dispatch({
      type: CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
      payload: webContendId,
    });
    clearingCacheState();
  };

  const handleClose = (): void => {
    dispatch({
      type: CLEAR_CACHE_DIALOG_DISMISSED,
    });
  };

  useEffect(() => {
    listen(CLEAR_CACHE_TRIGGERED, async (action) => {
      setWebcontentId(action.payload);
      setIsVisible(true);
    });

    listen(CLEAR_CACHE_DIALOG_DISMISSED, () => {
      setIsVisible(false);
      setClearingCache(false);
    });
  }, [dispatch]);

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box
        width='x300'
        display='flex'
        flexDirection='column'
        alignItems='center'
      >
        <Margins block='x18'>
          <Box fontScale='h1'>{t('dialog.clearCache.announcement')}</Box>
          <Box>
            <strong>{t('dialog.clearCache.title')}</strong>
            <br />
            {t('dialog.clearCache.message')}
          </Box>
        </Margins>
      </Box>
      {!clearingCache && (
        <ButtonGroup stretch vertical>
          <Button type='button' primary onClick={handleKeepButtonClick}>
            {t('dialog.clearCache.keepLoginData')}
          </Button>
          <Button type='button' danger onClick={handleDeleteButtonClick}>
            {t('dialog.clearCache.deleteLoginData')}
          </Button>
          <Button type='button' onClick={handleClose}>
            {t('dialog.clearCache.cancel')}
          </Button>
        </ButtonGroup>
      )}
      {clearingCache && (
        <Box
          width='x300'
          display='flex'
          flexDirection='column'
          alignItems='center'
        >
          <Margins block='x20'>
            <Box fontScale='h3'>{t('dialog.clearCache.clearingWait')}</Box>
            <Throbber size='x16' />
          </Margins>
        </Box>
      )}
    </Dialog>
  );
};
