import {
  Field,
  FieldLabel,
  FieldHint,
  InputBox,
  Box,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED } from '../../../actions';

type E2ePdfPreviewSizeLimitProps = {
  className?: string;
};

export const E2ePdfPreviewSizeLimit = (props: E2ePdfPreviewSizeLimitProps) => {
  const e2ePdfPreviewSizeLimit = useSelector(
    ({ e2ePdfPreviewSizeLimit }: RootState) => e2ePdfPreviewSizeLimit
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(event.currentTarget.value, 10);
      if (Number.isNaN(raw)) return;
      const clamped = Math.max(1, Math.min(500, raw));
      dispatch({
        type: SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED,
        payload: clamped,
      });
    },
    [dispatch]
  );

  const id = useId();

  return (
    <Field className={props.className} marginBlock='x16'>
      <Box
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        alignItems='flex-start'
      >
        <Box display='flex' flexDirection='column'>
          <FieldLabel htmlFor={id}>
            {t('settings.options.e2ePdfPreviewSizeLimit.title')}
          </FieldLabel>
          <FieldHint>
            {t('settings.options.e2ePdfPreviewSizeLimit.description')}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' style={{ paddingTop: '4px' }}>
          <InputBox
            id={id}
            type='number'
            min={1}
            max={500}
            step={1}
            value={e2ePdfPreviewSizeLimit}
            onChange={handleChange}
            style={{ maxWidth: '5rem' }}
          />
        </Box>
      </Box>
    </Field>
  );
};
