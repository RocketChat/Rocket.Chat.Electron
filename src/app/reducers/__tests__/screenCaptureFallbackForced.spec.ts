import { APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET } from '../../actions';
import { screenCaptureFallbackForced } from '../screenCaptureFallbackForced';

describe('screenCaptureFallbackForced reducer', () => {
  const unknownAction = { type: 'UNKNOWN_ACTION', payload: undefined } as any;

  it('should default to false', () => {
    expect(screenCaptureFallbackForced(undefined, unknownAction)).toBe(false);
  });

  it('should set value from APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET', () => {
    expect(
      screenCaptureFallbackForced(false, {
        type: APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET,
        payload: true,
      } as any)
    ).toBe(true);
  });

  it('should preserve state on unknown action', () => {
    expect(screenCaptureFallbackForced(true, unknownAction)).toBe(true);
  });
});
