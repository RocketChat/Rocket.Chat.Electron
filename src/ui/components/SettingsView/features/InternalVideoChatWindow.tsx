import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_INTERNALVIDEOCHATWINDOW_OPT_IN_CHANGED } from '../../../actions';

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
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isInternalVideoChatWindowEnabledId}>
          {t('settings.options.internalVideoChatWindow.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isInternalVideoChatWindowEnabledId}
          disabled={process.mas}
          checked={isInternalVideoChatWindowEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        {process.mas ? (
          <FieldHint>
            {t('settings.options.internalVideoChatWindow.masDescription')}
          </FieldHint>
        ) : (
          <FieldHint>
            <Trans
              i18nKey='settings.options.internalVideoChatWindow.description'
              t={t}
            >
              When set Video Chat will be opened using an application's window,
              otherwise the default browser will be used.
              <strong>Google Meet</strong> share screen is not supported in
              Electron applications, so this configuration don't change Meet
              calls behavior, that will open on browser.
            </Trans>
          </FieldHint>
        )}
      </FieldRow>
    </Field>
  );
};
