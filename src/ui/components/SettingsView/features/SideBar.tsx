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
import { SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED } from '../../../actions';

type SideBarProps = {
  className?: string;
};

export const SideBar = (props: SideBarProps) => {
  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
  );
  const isMenuBarEnabled = useSelector(
    ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled
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

  const isSideBarEnabledId = useId();

  // Prevent disabling sidebar if menu bar is already disabled to ensure settings access
  const canDisable = isMenuBarEnabled || isSideBarEnabled;

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isSideBarEnabledId}>
          {t('settings.options.sidebar.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isSideBarEnabledId}
          checked={isSideBarEnabled}
          onChange={handleChange}
          disabled={!canDisable}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {!isMenuBarEnabled && isSideBarEnabled
            ? t('settings.options.sidebar.disabledHint')
            : t('settings.options.sidebar.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
