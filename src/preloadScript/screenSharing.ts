import * as screenSharingActions from '../common/actions/screenSharingActions';
import { dispatch } from '../common/store';

export const notifyScreenSharingSource = (sourceId: string): void => {
  window.top.postMessage({ sourceId }, '*');
};

export const rejectScreenSharingRequest = (): void => {
  window.top.postMessage({ sourceId: 'PermissionDeniedError' }, '*');
};

export const listenToScreenSharingRequests = (): void => {
  window.addEventListener('get-sourceId', () => {
    dispatch(screenSharingActions.sourceRequested());
  });
};
