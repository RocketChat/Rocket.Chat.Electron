import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type InternalVideoChatWindowProps = {
  className?: string;
};

export const InternalVideoChatWindow = (
  props: InternalVideoChatWindowProps
) => {
  const isInternalVideoChatWindowEnabled = useSelector(
    ({ isInternalVideoChatWindowEnabled }: RootState) =>
      isInternalVideoChatWindowEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isInternalVideoChatWindowEnabledId = useId();

  return (
    <ToggleField
      id={isInternalVideoChatWindowEnabledId}
      label={t('settings.options.internalVideoChatWindow.title')}
      description={
        process.mas
          ? t('settings.options.internalVideoChatWindow.masDescription')
          : t('settings.options.internalVideoChatWindow.description')
      }
      checked={isInternalVideoChatWindowEnabled}
      onChange={handleChange}
      disabled={process.mas}
      className={props.className}
    />
  );
};
