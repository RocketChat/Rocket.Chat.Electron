import { BrowserWindow, TouchBar as ElectronTouchBar } from 'electron';
import { useEffect } from 'react';

import { useInitRef } from '../../../common/hooks/useInitRef';
import { useMessageBoxFormattingButtons } from './useMessageBoxFormattingButtons';
import { useServerSelectionPopover } from './useServerSelectionPopover';

type TouchBarProps = {
  rootWindow?: BrowserWindow;
};

const TouchBar = ({ rootWindow }: TouchBarProps): null => {
  const serverSelectionPopover = useServerSelectionPopover();

  const messageBoxFormattingButtons = useMessageBoxFormattingButtons();

  const touchBarRef = useInitRef(
    () =>
      new ElectronTouchBar({
        items: [
          serverSelectionPopover,
          new ElectronTouchBar.TouchBarSpacer({ size: 'flexible' }),
          messageBoxFormattingButtons,
          new ElectronTouchBar.TouchBarSpacer({ size: 'flexible' }),
        ],
      })
  );

  useEffect(() => {
    if (!rootWindow) {
      return;
    }

    rootWindow.setTouchBar(touchBarRef.current);

    return () => {
      rootWindow.setTouchBar(null);
    };
  }, [rootWindow, touchBarRef]);

  return null;
};

export default TouchBar;
