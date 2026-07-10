import { APP_VERSION_SET } from '../../actions';
import { appVersion } from '../appVersion';

describe('appVersion reducer', () => {
  const unknownAction = { type: 'UNKNOWN_ACTION', payload: undefined } as any;

  it('should default to null', () => {
    expect(appVersion(undefined, unknownAction)).toBeNull();
  });

  it('should set value from APP_VERSION_SET', () => {
    expect(
      appVersion(null, {
        type: APP_VERSION_SET,
        payload: '5.0.0',
      } as any)
    ).toBe('5.0.0');
  });

  it('should preserve state on unknown action', () => {
    expect(appVersion('4.9.0', unknownAction)).toBe('4.9.0');
  });
});
