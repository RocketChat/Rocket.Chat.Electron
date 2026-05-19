import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import { SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED } from '../actions';

export const e2ePdfPreviewSizeLimit: Reducer<
  number,
  | ActionOf<typeof SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>
> = (state = 10, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED:
      return action.payload.e2ePdfPreviewSizeLimit ?? state;
    case SETTINGS_SET_E2E_PDF_PREVIEW_SIZE_LIMIT_CHANGED:
      return action.payload;
    default:
      return state;
  }
};
