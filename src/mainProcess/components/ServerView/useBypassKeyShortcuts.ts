import type { Input, WebContents } from 'electron';
import { useEffect } from 'react';

import { useAppSelector } from '../../../common/hooks/useAppSelector';

export const useBypassKeyShortcuts = (
  guestWebContents: WebContents | undefined
): void => {
  const platform = useAppSelector((state) => state.app.platform);

  useEffect(() => {
    if (!guestWebContents) {
      return;
    }

    const handleBeforeInputEvent = (
      _event: Event,
      { type, key }: Input
    ): void => {
      if (type !== 'keyUp' && type !== 'keyDown') {
        return;
      }

      const shortcutKey = platform === 'darwin' ? 'Meta' : 'Control';

      if (key !== shortcutKey) {
        return;
      }

      guestWebContents.hostWebContents.sendInputEvent({
        type,
        keyCode: key,
        modifiers: [],
      });
    };

    guestWebContents.on('before-input-event', handleBeforeInputEvent);

    return () => {
      guestWebContents.off('before-input-event', handleBeforeInputEvent);
    };
  }, [guestWebContents, platform]);
};
