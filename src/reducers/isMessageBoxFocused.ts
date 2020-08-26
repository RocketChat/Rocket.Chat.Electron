import { Reducer } from 'redux';

import {
  WEBVIEW_MESSAGE_BOX_FOCUSED,
  WEBVIEW_MESSAGE_BOX_BLURRED,
  WEBVIEW_DID_START_LOADING,
  WEBVIEW_DID_FAIL_LOAD,
  WebviewMessageBoxFocusedAction,
  WebviewMessageBoxBlurredAction,
  WebviewDidStartLoadingAction,
  WebviewDidFailLoadAction,
} from '../actions';

type IsMessageBoxFocusedAction = (
  WebviewMessageBoxFocusedAction
  | WebviewMessageBoxBlurredAction
  | WebviewDidStartLoadingAction
  | WebviewDidFailLoadAction
);


export const isMessageBoxFocused: Reducer<boolean, IsMessageBoxFocusedAction> = (state = false, action) => {
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
