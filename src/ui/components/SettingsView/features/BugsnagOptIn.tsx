import { ToggleSwitch, Field } from '@rocket.chat/fuselage';
import React, { ChangeEvent, Dispatch, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { RootAction } from '../../../../store/actions';
import { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_BUGSNAG_OPT_IN } from '../../../actions';

export const BugsnagOptIn: FC = () => {
  const isBugsnagEnabled = useSelector(
    ({ isBugsnagEnabled }: RootState) => isBugsnagEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const { t } = useTranslation();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.currentTarget.checked;
    dispatch({ type: SETTINGS_SET_BUGSNAG_OPT_IN, payload: isChecked });
  };

  return (
    <>
      <Field>
        <Field.Row>
          <ToggleSwitch onChange={handleChange} checked={isBugsnagEnabled} />
          <Field.Label htmlFor='toggle-switch'>
            {t('settings.inner.title')}
          </Field.Label>
          <Field.Label htmlFor='toggle-switch'>
            {t('settings.inner.description')}
          </Field.Label>
        </Field.Row>
      </Field>
    </>
  );
};
