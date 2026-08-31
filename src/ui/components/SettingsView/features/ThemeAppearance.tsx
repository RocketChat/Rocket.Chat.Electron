import {
  Box,
  Field,
  FieldDescription,
  FieldLabel,
  FieldRow,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_USER_THEME_PREFERENCE_CHANGED } from '../../../actions';
import { ChromeThumbnailOption } from './ChromeThumbnailOption';
import { THUMBNAIL_GAP } from './thumbnailMetrics';

type ThemeAppearanceProps = {
  className?: string;
};

type ThemePreference = 'auto' | 'light' | 'dark';

export const ThemeAppearance = (props: ThemeAppearanceProps) => {
  const userThemePreference = useSelector(
    ({ userThemePreference }: RootState) => userThemePreference
  );
  // Preview the user's own navigation layout, so this row and the navigation
  // row show the same window and only differ in palette.
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
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

  const groupName = useId();

  const options = useMemo(
    (): [ThemePreference, string][] => [
      ['auto', t('settings.options.themeAppearance.auto')],
      ['light', t('settings.options.themeAppearance.light')],
      ['dark', t('settings.options.themeAppearance.dark')],
    ],
    [t]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel>{t('settings.options.themeAppearance.title')}</FieldLabel>
      </FieldRow>
      <FieldDescription>
        {t('settings.options.themeAppearance.description')}
      </FieldDescription>
      <Box
        display='flex'
        flexWrap='wrap'
        mbs='x12'
        style={{ gap: `${THUMBNAIL_GAP}px` }}
      >
        {options.map(([value, label]) => (
          <ChromeThumbnailOption
            key={value}
            name={groupName}
            value={value}
            label={label}
            layout={navigationLayout}
            theme={value}
            checked={userThemePreference === value}
            onChange={handleChange(value)}
          />
        ))}
      </Box>
    </Field>
  );
};
