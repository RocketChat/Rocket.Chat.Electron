import { Select } from '@rocket.chat/fuselage';
import { useCallback, useId, useMemo } from 'react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_USER_THEME_PREFERENCE_CHANGED } from '../../../actions';
import { SettingField } from './SettingField';

type ThemeAppearanceProps = {
  className?: string;
};

export const ThemeAppearance = (props: ThemeAppearanceProps) => {
  const themeSelectId = useId();
  const userThemePreference = useSelector(
    ({ userThemePreference }: RootState) => userThemePreference
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChangeTheme = useCallback(
    (value: Key) => {
      const stringValue = String(value);
      if (
        stringValue !== 'auto' &&
        stringValue !== 'light' &&
        stringValue !== 'dark'
      ) {
        return;
      }
      dispatch({
        type: SETTINGS_USER_THEME_PREFERENCE_CHANGED,
        payload: stringValue as 'auto' | 'light' | 'dark',
      });
    },
    [dispatch]
  );

  const options = useMemo(
    (): [string, string][] => [
      ['auto', t('settings.options.themeAppearance.auto')],
      ['light', t('settings.options.themeAppearance.light')],
      ['dark', t('settings.options.themeAppearance.dark')],
    ],
    [t]
  );

  return (
    <SettingField
      htmlFor={themeSelectId}
      className={props.className}
      label={t('settings.options.themeAppearance.title')}
      hint={t('settings.options.themeAppearance.description')}
    >
      <Select
        id={themeSelectId}
        options={options}
        value={userThemePreference}
        onChange={handleChangeTheme}
      />
    </SettingField>
  );
};
