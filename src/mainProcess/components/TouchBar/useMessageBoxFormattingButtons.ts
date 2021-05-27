import {
  nativeImage,
  TouchBar as ElectronTouchBar,
  TouchBarSegmentedControl,
} from 'electron';
import { useEffect } from 'react';

import * as messageBoxActions from '../../../common/actions/messageBoxActions';
import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { useInitRef } from '../../../common/hooks/useInitRef';
import { joinAsarPath } from '../../joinAsarPath';

export const useMessageBoxFormattingButtons = (): TouchBarSegmentedControl => {
  const ids = [
    'bold',
    'italic',
    'strike',
    'inline_code',
    'multi_line',
  ] as const;

  const enabled = useAppSelector(
    (state) => state.ui.messageBox.focused ?? false
  );
  const dispatch = useAppDispatch();

  const messageBoxFormattingButtonsRef = useInitRef(
    () =>
      new ElectronTouchBar.TouchBarSegmentedControl({
        mode: 'buttons',
        segments: ids.map((id) => ({
          icon: nativeImage.createFromPath(
            joinAsarPath(`images/touch-bar/${id}.png`)
          ),
          enabled,
        })),
        change: (selectedIndex) => {
          dispatch(rootWindowActions.focused());
          dispatch(messageBoxActions.formatButtonClicked(ids[selectedIndex]));
        },
      })
  );

  useEffect(() => {
    if (!messageBoxFormattingButtonsRef.current) {
      return;
    }

    for (const segment of messageBoxFormattingButtonsRef.current.segments) {
      segment.enabled = enabled;
    }
    messageBoxFormattingButtonsRef.current.selectedIndex = 0;
  }, [enabled, messageBoxFormattingButtonsRef]);

  return messageBoxFormattingButtonsRef.current;
};
