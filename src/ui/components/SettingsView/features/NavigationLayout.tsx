import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldRow,
  RadioButton,
  Box,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED } from '../../../actions';
import type { NavigationLayout as NavigationLayoutValue } from '../../../common';

type NavigationLayoutProps = {
  className?: string;
};

export const NavigationLayout = (props: NavigationLayoutProps) => {
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
  );
  const isMenuBarEnabled = useSelector(
    ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled
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

  const workspaceTabsId = useId();
  const workspaceBarId = useId();
  const workspaceHiddenId = useId();

  const isWorkspaceTabsDisabled =
    process.platform === 'linux' &&
    !isMenuBarEnabled &&
    navigationLayout !== 'tabs';

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel>{t('settings.options.navigation.title')}</FieldLabel>
      </FieldRow>
      <FieldDescription>
        {isWorkspaceTabsDisabled
          ? t('settings.options.navigation.disabledHint')
          : t('settings.options.navigation.description')}
      </FieldDescription>
      <Box display='flex' flexDirection='column' mbs='x8'>
        <Box display='flex' alignItems='center' mbe='x8'>
          <RadioButton
            id={workspaceTabsId}
            checked={navigationLayout === 'tabs'}
            disabled={isWorkspaceTabsDisabled}
            onChange={handleChange('tabs')}
          />
          <FieldLabel htmlFor={workspaceTabsId} mis='x8'>
            {t('settings.options.navigation.workspaceTabs')}
          </FieldLabel>
        </Box>
        <Box display='flex' alignItems='center' mbe='x8'>
          <RadioButton
            id={workspaceBarId}
            checked={navigationLayout === 'sidebar'}
            onChange={handleChange('sidebar')}
          />
          <FieldLabel htmlFor={workspaceBarId} mis='x8'>
            {t('settings.options.navigation.workspaceBar')}
          </FieldLabel>
        </Box>
        <Box display='flex' alignItems='center'>
          <RadioButton
            id={workspaceHiddenId}
            checked={navigationLayout === 'hidden'}
            onChange={handleChange('hidden')}
          />
          <FieldLabel htmlFor={workspaceHiddenId} mis='x8'>
            {t('settings.options.navigation.workspaceHidden')}
          </FieldLabel>
        </Box>
      </Box>
    </Field>
  );
};
