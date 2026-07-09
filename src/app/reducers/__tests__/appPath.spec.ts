import { APP_PATH_SET } from '../../actions';
import { appPath } from '../appPath';

describe('appPath reducer', () => {
  const unknownAction = { type: 'UNKNOWN_ACTION', payload: undefined } as any;

  it('should default to null', () => {
    expect(appPath(undefined, unknownAction)).toBeNull();
  });

  it('should set value from APP_PATH_SET', () => {
    expect(
      appPath(null, {
        type: APP_PATH_SET,
        payload: '/tmp/app-path',
      } as any)
    ).toBe('/tmp/app-path');
  });

  it('should preserve state on unknown action', () => {
    expect(appPath('/tmp/existing', unknownAction)).toBe('/tmp/existing');
  });
});
