import {
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
  Select,
} from '@rocket.chat/fuselage';
import type { Key } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { GpuFallbackMode as GpuFallbackModeType } from '../../../../app/PersistableValues';
import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_GPU_FALLBACK_MODE_CHANGED } from '../../../actions';

type GpuFallbackModeProps = {
  className?: string;
};

export const GpuFallbackMode = (props: GpuFallbackModeProps) => {
  const gpuFallbackMode = useSelector(
    ({ gpuFallbackMode }: RootState) => gpuFallbackMode
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (value: Key) => {
      const stringValue = String(value);
      if (
        stringValue === 'none' ||
        stringValue === 'x11' ||
        stringValue === 'disabled'
      ) {
        dispatch({
          type: SETTINGS_GPU_FALLBACK_MODE_CHANGED,
          payload: stringValue as GpuFallbackModeType,
        });
      }
    },
    [dispatch]
  );

  const options = useMemo(
    (): [string, string][] => [
      ['none', t('settings.options.gpuFallbackMode.options.auto')],
      ['x11', t('settings.options.gpuFallbackMode.options.x11')],
      ['disabled', t('settings.options.gpuFallbackMode.options.disabled')],
    ],
    [t]
  );

  // Only show on Linux
  if (process.platform !== 'linux') {
    return null;
  }

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel>{t('settings.options.gpuFallbackMode.title')}</FieldLabel>
        <Select
          options={options}
          value={gpuFallbackMode}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.gpuFallbackMode.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
