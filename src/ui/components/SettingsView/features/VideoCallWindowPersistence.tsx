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
import { SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED } from '../../../actions';

type VideoCallWindowPersistenceProps = {
  className?: string;
};

export const VideoCallWindowPersistence = (
  props: VideoCallWindowPersistenceProps
) => {
  const isVideoCallWindowPersistenceEnabled = useSelector(
    ({ isVideoCallWindowPersistenceEnabled }: RootState) =>
      isVideoCallWindowPersistenceEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_VIDEO_CALL_WINDOW_PERSISTENCE_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const id = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={id}>
          {t('settings.options.videoCallWindowPersistence.title')}
        </FieldLabel>
        <ToggleSwitch
          id={id}
          checked={isVideoCallWindowPersistenceEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.videoCallWindowPersistence.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
