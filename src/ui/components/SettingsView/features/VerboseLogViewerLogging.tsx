import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_VERBOSE_LOGVIEWER_LOGGING_CHANGED } from '../../../actions';

type VerboseLogViewerLoggingProps = {
  className?: string;
};

export const VerboseLogViewerLogging = (
  props: VerboseLogViewerLoggingProps
) => {
  const isVerboseLogViewerLoggingEnabled = useSelector(
    ({ isVerboseLogViewerLoggingEnabled }: RootState) =>
      isVerboseLogViewerLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_LOGVIEWER_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseLogViewerLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseLogViewerLoggingEnabledId}>
          {t('settings.options.verboseLogViewerLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseLogViewerLoggingEnabledId}
          checked={isVerboseLogViewerLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseLogViewerLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
