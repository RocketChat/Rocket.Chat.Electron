import type { Reducer } from 'redux';

import type { ActionOf } from '../store/actions';
import { UPLOAD_STARTED, UPLOAD_FINISHED, UPLOAD_FAILED } from './actions';

type UploadsState = number;

const initialState: UploadsState = 0;

export const activeUploads: Reducer<
  UploadsState,
  ActionOf<typeof UPLOAD_STARTED | typeof UPLOAD_FINISHED | typeof UPLOAD_FAILED>
> = (state = initialState, action) => {
  switch (action.type) {
    case UPLOAD_STARTED:
      return state + 1;

    case UPLOAD_FINISHED:
    case UPLOAD_FAILED:
      return Math.max(0, state - 1);

    default:
      return state;
  }
};
