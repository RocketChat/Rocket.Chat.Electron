import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED } from '../../../actions';

type MenuBarProps = {
  className?: string;
};

export const MenuBar = (props: MenuBarProps) => {
  const isMenuBarEnabled = useSelector(
    ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isMenuBarEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isMenuBarEnabledId}>
          {t('settings.options.menubar.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isMenuBarEnabledId}
          checked={isMenuBarEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.menubar.description')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
