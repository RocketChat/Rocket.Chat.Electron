import { desktopCapturer } from 'electron';

import type { DisplayMediaCallback, ScreenPickerProvider } from '../types';

export class PortalPickerProvider implements ScreenPickerProvider {
  readonly type = 'portal' as const;

  readonly requiresInternalUI = false;

  readonly requiresCacheWarming = false;

  handleDisplayMediaRequest(callback: DisplayMediaCallback): void {
    // On Linux/Wayland, calling getSources() triggers the XDG portal picker.
    // The portal typically returns exactly one source on selection or an empty array
    // on cancellation; we defensively check for > 0 and use only the first source.
    console.log(
      'Screen picker [portal]: triggering XDG portal picker via getSources()'
    );

    desktopCapturer
      .getSources({ types: ['screen', 'window'] })
      .then((sources) => {
        if (sources.length > 0) {
          // User selected a source via portal picker
          callback({ video: sources[0] });
        } else {
          // User cancelled or no source available
          console.warn('Screen picker [portal]: No source selected by user');
          callback({ video: false } as any);
        }
      })
      .catch((error) => {
        console.error(
          'Screen picker [portal]: Failed to get source from XDG portal:',
          error
        );
        callback({ video: false } as any);
      });
  }

  async initialize(): Promise<void> {
    // Portal picker requires no initialization
    console.log('Screen picker [portal]: initialized (no-op)');
  }

  cleanup(): void {
    // Portal picker requires no cleanup
    console.log('Screen picker [portal]: cleanup (no-op)');
  }
}
