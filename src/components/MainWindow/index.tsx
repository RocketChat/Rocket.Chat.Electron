import React, { useEffect, FC } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import {
  ROOT_WINDOW_EDIT_FLAGS_CHANGED,
  RootAction,
} from '../../actions';

export const MainWindow: FC = ({ children }) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  useEffect(() => {
    const fetchAndDispatchEditFlags = (): void => {
      dispatch({
        type: ROOT_WINDOW_EDIT_FLAGS_CHANGED,
        payload: {
          canUndo: document.queryCommandEnabled('undo'),
          canRedo: document.queryCommandEnabled('redo'),
          canCut: document.queryCommandEnabled('cut'),
          canCopy: document.queryCommandEnabled('copy'),
          canPaste: document.queryCommandEnabled('paste'),
          canSelectAll: document.queryCommandEnabled('selectAll'),
        },
      });
    };

    document.addEventListener('focus', fetchAndDispatchEditFlags, true);
    document.addEventListener('selectionchange', fetchAndDispatchEditFlags, true);

    return () => {
      document.removeEventListener('focus', fetchAndDispatchEditFlags, true);
      document.removeEventListener('selectionchange', fetchAndDispatchEditFlags, true);
    };
  }, [dispatch]);

  return <>{children}</>;
};
