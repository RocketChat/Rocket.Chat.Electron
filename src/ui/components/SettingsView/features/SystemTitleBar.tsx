import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_LINUX_SYSTEM_TITLE_BAR_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type SystemTitleBarProps = {
  className?: string;
};

/**
 * Linux-only opt-in toggle: "Use system title bar".
 *
 * When enabled, the app uses native WM decorations instead of the in-app
 * client-side chrome introduced in #3450. A restart is required for the change
 * to take effect because `titleBarStyle` is fixed at window-creation time.
 */
export const SystemTitleBar = (props: SystemTitleBarProps) => {
  const isLinuxSystemTitleBarEnabled = useSelector(
    ({ isLinuxSystemTitleBarEnabled }: RootState) =>
      isLinuxSystemTitleBarEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_LINUX_SYSTEM_TITLE_BAR_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const id = useId();

  return (
    <ToggleField
      id={id}
      label={t('settings.options.systemTitleBar.title')}
      description={t('settings.options.systemTitleBar.description')}
      checked={isLinuxSystemTitleBarEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
