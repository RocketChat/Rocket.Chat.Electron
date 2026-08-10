import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldRow,
  Box,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED } from '../../../actions';
import type { NavigationLayout as NavigationLayoutValue } from '../../../common';
import { ChromeThumbnailOption } from './ChromeThumbnailOption';
import { THUMBNAIL_GAP } from './thumbnailMetrics';

type NavigationLayoutProps = {
  className?: string;
};

export const NavigationLayout = (props: NavigationLayoutProps) => {
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
  );
  const userThemePreference = useSelector(
    ({ userThemePreference }: RootState) => userThemePreference
  );
  const machineTheme = useSelector(
    ({ machineTheme }: RootState) => machineTheme
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (value: NavigationLayoutValue) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.currentTarget.checked) {
          return;
        }
        dispatch({
          type: SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
          payload: value,
        });
      },
    [dispatch]
  );

  const groupName = useId();

  // Each thumbnail previews the layout it selects, drawn in the theme the user
  // is actually running so the previews match their window. `machineTheme` is
  // loosely typed as a string, so anything that is not dark falls back to light.
  const resolvedTheme =
    userThemePreference === 'auto' ? machineTheme : userThemePreference;
  const previewTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const options = useMemo(
    (): [NavigationLayoutValue, string][] => [
      ['tabs', t('settings.options.navigation.workspaceTabs')],
      ['sidebar', t('settings.options.navigation.workspaceBar')],
      ['hidden', t('settings.options.navigation.workspaceHidden')],
    ],
    [t]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel>{t('settings.options.navigation.title')}</FieldLabel>
      </FieldRow>
      <FieldDescription>
        {t('settings.options.navigation.description')}
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
            layout={value}
            theme={previewTheme}
            checked={navigationLayout === value}
            onChange={handleChange(value)}
          />
        ))}
      </Box>
    </Field>
  );
};
