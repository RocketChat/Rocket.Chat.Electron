import { request } from '../store';
import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../ui/actions';

const handleGetSourceIdEvent = async (): Promise<void> => {
  try {
    const sourceId = await request<
      typeof WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED
    >({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
    });
    window.top.postMessage({ sourceId }, '*');
  } catch (error) {
    window.top.postMessage({ sourceId: 'PermissionDeniedError' }, '*');
  }
};

export const listenToScreenSharingRequests = (): void => {
  window.addEventListener('get-sourceId', handleGetSourceIdEvent);
};
