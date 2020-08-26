import { EditFlags } from 'electron';
import { Reducer } from 'redux';

import {
  ROOT_WINDOW_EDIT_FLAGS_CHANGED,
  WEBVIEW_EDIT_FLAGS_CHANGED,
  EditFlagsActionTypes,
} from '../actions';

export const editFlags: Reducer<EditFlags, EditFlagsActionTypes> = (state = {
  canUndo: false,
  canRedo: false,
  canCut: false,
  canCopy: false,
  canPaste: false,
  canSelectAll: false,
  canDelete: false,
}, action) => {
  switch (action.type) {
    case ROOT_WINDOW_EDIT_FLAGS_CHANGED:
      return action.payload;

    case WEBVIEW_EDIT_FLAGS_CHANGED:
      return action.payload;

    default:
      return state;
  }
};
