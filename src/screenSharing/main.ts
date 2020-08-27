import { dispatch, listen } from '../store';
import { ActionOf } from '../store/actions';
import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../ui/actions';
import { SCREEN_SHARING_DIALOG_DISMISSED } from './actions';

export const setupScreenSharing = (): void => {
  listen(WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, (action) => {
    const isResponse: Parameters<typeof listen>[0] = (responseAction) =>
      [
        WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
        SCREEN_SHARING_DIALOG_DISMISSED,
      ].includes(responseAction.type)
      && responseAction.meta?.id === action.meta.id;

    const unsubscribe = listen(isResponse, (responseAction: ActionOf<
      typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED
    | typeof SCREEN_SHARING_DIALOG_DISMISSED
    >) => {
      unsubscribe();

      const sourceId = responseAction.type === WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED
        ? responseAction.payload
        : null;

      dispatch({
        type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
        payload: sourceId,
        meta: {
          response: true,
          id: action.meta?.id,
        },
      });
    });
  });
};
