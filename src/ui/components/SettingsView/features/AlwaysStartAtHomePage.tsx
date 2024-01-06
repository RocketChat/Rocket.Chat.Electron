import {
  Field,
  FieldHint,
  FieldLabel,
  FieldRow,
  ToggleSwitch,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, FC } from 'react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_DO_ALWAYS_START_AT_HOME_PAGE_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const AlwaysStartAtHomePage: FC<Props> = (props) => {
  const isEnabled = useSelector(
    ({ doAlwaysStartAtHomePage }: RootState) => doAlwaysStartAtHomePage
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_DO_ALWAYS_START_AT_HOME_PAGE_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <ToggleSwitch onChange={handleChange} checked={isEnabled} />
        <FieldLabel htmlFor='toggle-switch'>
          {t('settings.options.startPage.title')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.startPage.description')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
