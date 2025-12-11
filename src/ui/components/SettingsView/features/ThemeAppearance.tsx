import {
  Box,
  Field,
  FieldLabel,
  FieldHint,
  Select,
} from '@rocket.chat/fuselage';
import { useCallback, useMemo } from 'react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_USER_THEME_PREFERENCE_CHANGED } from '../../../actions';

type ThemeAppearanceProps = {
  className?: string;
};

export const ThemeAppearance = (props: ThemeAppearanceProps) => {
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
    <Field className={props.className}>
      <Box
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        alignItems='flex-start'
      >
        <Box display='flex' flexDirection='column'>
          <FieldLabel>{t('settings.options.themeAppearance.title')}</FieldLabel>
          <FieldHint>
            {t('settings.options.themeAppearance.description')}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' style={{ paddingTop: '4px' }}>
          <Select
            options={options}
            value={userThemePreference}
            onChange={handleChangeTheme}
            width={220}
          />
        </Box>
      </Box>
    </Field>
  );
};

