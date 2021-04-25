import { Reducer } from 'redux';

import { ActionOf } from '../../store/actions';
import {
  WEBVIEW_MESSAGE_BOX_FOCUSED,
  WEBVIEW_MESSAGE_BOX_BLURRED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
} from '../actions';

type IsMessageBoxFocusedAction =
  | ActionOf<typeof WEBVIEW_MESSAGE_BOX_FOCUSED>
  | ActionOf<typeof WEBVIEW_DID_START_LOADING>
  | ActionOf<typeof WEBVIEW_MESSAGE_BOX_BLURRED>
  | ActionOf<typeof WEBVIEW_DID_FAIL_LOAD>;

export const isMessageBoxFocused: Reducer<
  boolean,
  IsMessageBoxFocusedAction
> = (state = false, action) => {
  switch (action.type) {
    case WEBVIEW_MESSAGE_BOX_FOCUSED:
      return true;

    case WEBVIEW_DID_START_LOADING:
    case WEBVIEW_MESSAGE_BOX_BLURRED:
    case WEBVIEW_DID_FAIL_LOAD:
      return false;

    default:
      return state;
  }
};
