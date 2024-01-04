import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED } from '../../../actions';

type MinimizeOnCloseProps = {
  className?: string;
};

export const MinimizeOnClose = (props: MinimizeOnCloseProps) => {
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
      <FieldRow>
        <ToggleSwitch
          disabled={isTrayIconEnabled}
          onChange={handleChange}
          checked={isMinimizeOnCloseEnabled}
        />
        <FieldLabel htmlFor='toggle-switch'>
          {t('settings.options.minimizeOnClose.title')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.minimizeOnClose.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
