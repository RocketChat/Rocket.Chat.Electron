import { Callout } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type FlashFrameProps = {
  className?: string;
};

export const FlashFrame = (props: FlashFrameProps) => {
  const isFlashFrameEnabled = useSelector(
    ({ isFlashFrameEnabled }: RootState) => isFlashFrameEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isFlashFrameEnabledId = useId();

  return (
    <ToggleField
      id={isFlashFrameEnabledId}
      label={
        process.platform !== 'darwin'
          ? t('settings.options.flashFrame.title')
          : t('settings.options.flashFrame.titleDarwin')
      }
      description={
        process.platform !== 'darwin'
          ? t('settings.options.flashFrame.description')
          : t('settings.options.flashFrame.descriptionDarwin')
      }
      checked={isFlashFrameEnabled}
      onChange={handleChange}
      className={props.className}
    >
      {process.platform === 'linux' && (
        <Callout
          title={t('settings.options.flashFrame.onLinux')}
          type='warning'
        />
      )}
    </ToggleField>
  );
};
