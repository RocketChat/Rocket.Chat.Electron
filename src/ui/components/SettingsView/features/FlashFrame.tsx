import { ToggleSwitch, Field, Callout } from '@rocket.chat/fuselage';
import React, { ChangeEvent, Dispatch, FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { RootAction } from '../../../../store/actions';
import { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const FlashFrame: FC<Props> = (props) => {
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

  return (
    <Field className={props.className}>
      <Field.Row>
        <ToggleSwitch onChange={handleChange} checked={isFlashFrameEnabled} />
        <Field.Label htmlFor='toggle-switch'>
          {process.platform !== 'darwin'
            ? t('settings.options.flashFrame.title')
            : t('settings.options.flashFrame.titleDarwin')}
        </Field.Label>
      </Field.Row>
      {process.platform === 'linux' && (
        <Callout
          title={t('settings.options.flashFrame.onLinux')}
          type='warning'
        />
      )}
      <Field.Row>
        <Field.Hint>
          {process.platform !== 'darwin'
            ? t('settings.options.flashFrame.description')
            : t('settings.options.flashFrame.descriptionDarwin')}
        </Field.Hint>
      </Field.Row>
    </Field>
  );
};
