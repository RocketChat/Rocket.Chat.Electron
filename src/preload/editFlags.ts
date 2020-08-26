import { EditFlags } from 'electron';
import { Effect, call } from 'redux-saga/effects';

import { WEBVIEW_EDIT_FLAGS_CHANGED } from '../actions';
import { dispatch } from '../channels';

const getEditFlags = (): EditFlags => ({
  canUndo: document.queryCommandEnabled('undo'),
  canRedo: document.queryCommandEnabled('redo'),
  canCut: document.queryCommandEnabled('cut'),
  canCopy: document.queryCommandEnabled('copy'),
  canPaste: document.queryCommandEnabled('paste'),
  canSelectAll: document.queryCommandEnabled('selectAll'),
  canDelete: document.queryCommandEnabled('delete'),
});

const handleFocusEvent = (): void => {
  dispatch({
    type: WEBVIEW_EDIT_FLAGS_CHANGED,
    payload: getEditFlags(),
  });
};

const handleSelectionChangeEvent = (): void => {
  dispatch({
    type: WEBVIEW_EDIT_FLAGS_CHANGED,
    payload: getEditFlags(),
  });
};

export function *attachEditFlagsHandling(): Generator<Effect, void> {
  yield call(() => {
    document.addEventListener('focus', handleFocusEvent, true);
    document.addEventListener('selectionchange', handleSelectionChangeEvent, true);
  });
}
