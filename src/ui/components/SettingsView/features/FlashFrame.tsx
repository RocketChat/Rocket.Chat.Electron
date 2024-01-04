import {
  ToggleSwitch,
  Field,
  Callout,
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
import { SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED } from '../../../actions';

type FlashFrameProps = {
  className?: string;
};

export const FlashFrame = (props: FlashFrameProps) => {
  const isFlashFrameEnabled = useSelector(
    ({ isFlashFrameEnabled }: RootState) => isFlashFrameEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_FLASHFRAME_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isFlashFrameEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isFlashFrameEnabledId}>
          {process.platform !== 'darwin'
            ? t('settings.options.flashFrame.title')
            : t('settings.options.flashFrame.titleDarwin')}
        </FieldLabel>
        <ToggleSwitch
          id={isFlashFrameEnabledId}
          checked={isFlashFrameEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      {process.platform === 'linux' && (
        <Callout
          title={t('settings.options.flashFrame.onLinux')}
          type='warning'
        />
      )}
      <FieldRow>
        <FieldHint>
          {process.platform !== 'darwin'
            ? t('settings.options.flashFrame.description')
            : t('settings.options.flashFrame.descriptionDarwin')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
