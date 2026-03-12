import { dispatch } from '../store';
import { UPLOAD_STARTED, UPLOAD_FINISHED, UPLOAD_FAILED } from './actions';

export const notifyUploadStarted = (id: string, fileName: string): void => {
  dispatch({
    type: UPLOAD_STARTED,
    payload: { id, fileName },
  });
};

export const notifyUploadFinished = (id: string): void => {
  dispatch({
    type: UPLOAD_FINISHED,
    payload: { id },
  });
};

export const notifyUploadFailed = (id: string): void => {
  dispatch({
    type: UPLOAD_FAILED,
    payload: { id },
  });
};
