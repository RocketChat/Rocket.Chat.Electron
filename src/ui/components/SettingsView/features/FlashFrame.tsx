import { ToggleSwitch, Field } from '@rocket.chat/fuselage';
import React, { ChangeEvent, Dispatch, FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { RootAction } from '../../../../store/actions';
import { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED } from '../../../actions';

export const FlashFrame: FC = () => {
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
    <Field>
      <Field.Row>
        <ToggleSwitch onChange={handleChange} checked={isFlashFrameEnabled} />
        <Field.Label htmlFor='toggle-switch'>
          {t('settings.options.flashFrame.title')}
        </Field.Label>
      </Field.Row>
      <Field.Row>
        <Field.Hint>{t('settings.options.flashFrame.description')}</Field.Hint>
      </Field.Row>
    </Field>
  );
};
