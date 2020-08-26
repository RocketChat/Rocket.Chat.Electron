import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WebviewScreenSharingSourceRespondedAction,
} from '../../actions';
import { request } from '../../store';

const handleGetSourceIdEvent = async (): Promise<void> => {
  try {
    const sourceId = await request<WebviewScreenSharingSourceRespondedAction>({
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
