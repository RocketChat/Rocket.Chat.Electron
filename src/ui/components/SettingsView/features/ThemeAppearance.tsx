import {
  Box,
  Field,
  FieldDescription,
  FieldLabel,
  FieldRow,
  RadioButton,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_USER_THEME_PREFERENCE_CHANGED } from '../../../actions';

type ThemeAppearanceProps = {
  className?: string;
};

type ThemePreference = 'auto' | 'light' | 'dark';

export const ThemeAppearance = (props: ThemeAppearanceProps) => {
  const userThemePreference = useSelector(
    ({ userThemePreference }: RootState) => userThemePreference
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (value: ThemePreference) => (event: ChangeEvent<HTMLInputElement>) => {
      if (!event.currentTarget.checked) {
        return;
      }
      dispatch({
        type: SETTINGS_USER_THEME_PREFERENCE_CHANGED,
        payload: value,
      });
    },
    [dispatch]
  );

  const autoId = useId();
  const lightId = useId();
  const darkId = useId();

  const options = useMemo(
    (): [ThemePreference, string, string][] => [
      ['auto', autoId, t('settings.options.themeAppearance.auto')],
      ['light', lightId, t('settings.options.themeAppearance.light')],
      ['dark', darkId, t('settings.options.themeAppearance.dark')],
    ],
    [autoId, lightId, darkId, t]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel>{t('settings.options.themeAppearance.title')}</FieldLabel>
      </FieldRow>
      <FieldDescription>
        {t('settings.options.themeAppearance.description')}
      </FieldDescription>
      <Box display='flex' flexDirection='column' mbs='x8'>
        {options.map(([value, id, label], index) => (
          <Box
            key={value}
            display='flex'
            alignItems='center'
            mbe={index < options.length - 1 ? 'x8' : undefined}
          >
            <RadioButton
              id={id}
              checked={userThemePreference === value}
              onChange={handleChange(value)}
            />
            <FieldLabel htmlFor={id} mis='x8'>
              {label}
            </FieldLabel>
          </Box>
        ))}
      </Box>
    </Field>
  );
};
