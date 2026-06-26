import type { ChangeEvent } from 'react';
import { useCallback, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_VIDEO_CALL_SCREEN_CAPTURE_FALLBACK_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type ScreenCaptureFallbackProps = {
  className?: string;
};

export const ScreenCaptureFallback = (props: ScreenCaptureFallbackProps) => {
  const isFallbackEnabled = useSelector(
    ({ isVideoCallScreenCaptureFallbackEnabled }: RootState) =>
      isVideoCallScreenCaptureFallbackEnabled
  );
  const isFallbackForced = useSelector(
    ({ screenCaptureFallbackForced }: RootState) => screenCaptureFallbackForced
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

  const description = useMemo(() => {
    if (isFallbackForced) {
      return t(
        'settings.options.videoCallScreenCaptureFallback.forcedDescription'
      );
    }
    return t('settings.options.videoCallScreenCaptureFallback.description');
  }, [isFallbackForced, t]);

  return (
    <ToggleField
      id={fallbackToggleId}
      label={t('settings.options.videoCallScreenCaptureFallback.title')}
      description={description}
      hint={t('settings.options.videoCallScreenCaptureFallback.hint')}
      checked={isFallbackEnabled || isFallbackForced}
      onChange={handleChange}
      disabled={isFallbackForced}
      className={props.className}
    />
  );
};
