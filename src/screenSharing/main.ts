import { dispatch, listen } from '../store';
import { ActionOf, RootAction } from '../store/actions';
import { hasMeta, isResponseTo } from '../store/fsa';
import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../ui/actions';
import { SCREEN_SHARING_DIALOG_DISMISSED } from './actions';

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
