import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../common/actions/uiActions';
import { request } from '../common/store';

const handleGetSourceIdEvent = async (): Promise<void> => {
  try {
    const sourceId = await request(
      {
        type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      },
      WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED
    );
    window.top.postMessage({ sourceId }, '*');
  } catch (error) {
    window.top.postMessage({ sourceId: 'PermissionDeniedError' }, '*');
  }
};

export const listenToScreenSharingRequests = (): void => {
  window.addEventListener('get-sourceId', handleGetSourceIdEvent);
};
