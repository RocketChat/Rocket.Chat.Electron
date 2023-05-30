import { ToggleSwitch, Field } from '@rocket.chat/fuselage';
import type { ChangeEvent, Dispatch, FC } from 'react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const InternalVideoChatWindow: FC<Props> = (props) => {
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

  return (
    <Field className={props.className}>
      <Field.Row>
        <ToggleSwitch
          disabled={process.mas}
          onChange={handleChange}
          checked={isInternalVideoChatWindowEnabled}
        />
        <Field.Label htmlFor='toggle-switch'>
          {t('settings.options.internalVideoChatWindow.title')}
        </Field.Label>
      </Field.Row>
      <Field.Row>
        {process.mas ? (
          <Field.Hint>
            {t('settings.options.internalVideoChatWindow.masDescription')}
          </Field.Hint>
        ) : (
          <Field.Hint>
            {t('settings.options.internalVideoChatWindow.description')}
          </Field.Hint>
        )}
      </Field.Row>
    </Field>
  );
};
