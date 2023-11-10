import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, Dispatch, FC } from 'react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const SideBar: FC<Props> = (props) => {
  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <ToggleSwitch onChange={handleChange} checked={isSideBarEnabled} />
        <FieldLabel htmlFor='toggle-switch'>
          {t('settings.options.sidebar.title')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.sidebar.description')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
