import { ToggleSwitch, Field } from '@rocket.chat/fuselage';
import React, { ChangeEvent, Dispatch, FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { RootAction } from '../../../../store/actions';
import { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const MinimizeOnClose: FC<Props> = (props) => {
  const isMinimizeOnCloseEnabled = useSelector(
    ({ isMinimizeOnCloseEnabled }: RootState) => isMinimizeOnCloseEnabled
  );
  const isTrayIconEnabled = useSelector(
    ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  return (
    <Field className={props.className}>
      <Field.Row>
        <ToggleSwitch
          disabled={isTrayIconEnabled}
          onChange={handleChange}
          checked={isMinimizeOnCloseEnabled}
        />
        <Field.Label htmlFor='toggle-switch'>
          {t('settings.options.minimizeOnClose.title')}
        </Field.Label>
      </Field.Row>
      <Field.Row>
        <Field.Hint>
          {t('settings.options.minimizeOnClose.description')}
        </Field.Hint>
      </Field.Row>
    </Field>
  );
};
