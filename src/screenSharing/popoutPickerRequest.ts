import type { BrowserWindow } from 'electron';

import type { ScreenSharingRequestTracker } from './ScreenSharingRequestTracker';
import type { DisplayMediaCallback } from './screenPicker/types';
import type { ScreenPickerWindowChannels } from './screenPickerWindow';
import { openScreenPickerWindow } from './screenPickerWindow';

/**
 * Opens a standalone picker window parented to `originWindow` and routes the
 * display-media request through `tracker`, closing the picker window once the
 * request settles (response, timeout, or cancellation via `originWindow`
 * closing first).
 */
export const requestViaPickerWindow = (
  tracker: ScreenSharingRequestTracker,
  originWindow: BrowserWindow,
  channels: ScreenPickerWindowChannels,
  cb: DisplayMediaCallback
): void => {
  let pickerWindow: BrowserWindow | null = null;
  let handle: { cancel: () => void } | null = null;

  handle = tracker.createRequest(
    cb,
    () => {
      pickerWindow = openScreenPickerWindow(originWindow, channels);
      pickerWindow.on('closed', () => {
        pickerWindow = null;
        handle?.cancel();
      });
    },
    {
      isStillValid: () => !originWindow.isDestroyed(),
      onDone: () => {
        if (pickerWindow && !pickerWindow.isDestroyed()) {
          pickerWindow.close();
        }
        pickerWindow = null;
      },
    }
  );
};
