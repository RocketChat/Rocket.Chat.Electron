import type { ActionOf, RootAction } from '../common/actions';
import { SCREEN_SHARING_DIALOG_DISMISSED } from '../common/actions/screenSharingActions';
import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../common/actions/uiActions';
import { hasMeta, isResponseTo } from '../common/fsa';
import { dispatch, listen } from '../common/store';

export const setupScreenSharing = (): void => {
  listen(WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, (requestAction) => {
    if (!hasMeta(requestAction) || !requestAction.meta.id) {
      return;
    }

    const predicate = (
      action: RootAction
    ): action is
      | ActionOf<typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED>
      | ActionOf<typeof SCREEN_SHARING_DIALOG_DISMISSED> =>
      isResponseTo(
        requestAction.meta.id,
        WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
        SCREEN_SHARING_DIALOG_DISMISSED
      )(action);

    const unsubscribe = listen(predicate, (responseAction) => {
      unsubscribe();

      const sourceId =
        responseAction.type === WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED
          ? responseAction.payload
          : null;

      dispatch({
        type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
        payload: sourceId,
        meta: {
          response: true,
          id: requestAction.meta?.id,
        },
      });
    });
  });
};
