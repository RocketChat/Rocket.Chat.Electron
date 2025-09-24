import {
  Field,
  FieldHint,
  FieldLabel,
  FieldRow,
  ToggleSwitch,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED } from '../../../actions';

type ScreenCaptureFallbackProps = {
  className?: string;
};

export const ScreenCaptureFallback = (props: ScreenCaptureFallbackProps) => {
  const isFallbackEnabled = useSelector(
    ({ isVideoCallScreenCaptureFallbackEnabled }: RootState) =>
      isVideoCallScreenCaptureFallbackEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const fallbackToggleId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={fallbackToggleId}>
          {t('settings.options.videoCallScreenCaptureFallback.title')}
        </FieldLabel>
        <ToggleSwitch
          id={fallbackToggleId}
          checked={isFallbackEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.videoCallScreenCaptureFallback.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
