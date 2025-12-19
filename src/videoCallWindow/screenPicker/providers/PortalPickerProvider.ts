import type { DisplayMediaCallback, ScreenPickerProvider } from '../types';

export class PortalPickerProvider implements ScreenPickerProvider {
  readonly type = 'portal' as const;
  readonly requiresInternalUI = false;
  readonly requiresCacheWarming = false;

  handleDisplayMediaRequest(callback: DisplayMediaCallback): void {
    // Empty video object delegates to OS picker via XDG portal
    console.log('Screen picker [portal]: delegating to OS screen picker');
    callback({ video: {} } as any);
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
