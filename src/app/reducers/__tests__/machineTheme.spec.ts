import { APP_MACHINE_THEME_SET } from '../../actions';
import { machineTheme } from '../machineTheme';

describe('machineTheme reducer', () => {
  const unknownAction = { type: 'UNKNOWN_ACTION', payload: undefined } as any;

  it('should default to light', () => {
    expect(machineTheme(undefined, unknownAction)).toBe('light');
  });

  it('should set value from APP_MACHINE_THEME_SET', () => {
    expect(
      machineTheme('light', {
        type: APP_MACHINE_THEME_SET,
        payload: 'dark',
      } as any)
    ).toBe('dark');
  });

  it('should preserve state on unknown action', () => {
    expect(machineTheme('dark', unknownAction)).toBe('dark');
  });
});
