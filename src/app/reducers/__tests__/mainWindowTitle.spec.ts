import { APP_MAIN_WINDOW_TITLE_SET } from '../../actions';
import { mainWindowTitle } from '../mainWindowTitle';

describe('mainWindowTitle reducer', () => {
  const unknownAction = { type: 'UNKNOWN_ACTION', payload: undefined } as any;

  it('should default to null', () => {
    expect(mainWindowTitle(undefined, unknownAction)).toBeNull();
  });

  it('should set value from APP_MAIN_WINDOW_TITLE_SET', () => {
    expect(
      mainWindowTitle(null, {
        type: APP_MAIN_WINDOW_TITLE_SET,
        payload: 'Workspace Alpha',
      } as any)
    ).toBe('Workspace Alpha');
  });

  it('should preserve state on unknown action', () => {
    expect(mainWindowTitle('Main', unknownAction)).toBe('Main');
  });
});
