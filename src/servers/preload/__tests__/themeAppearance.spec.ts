import { setUserThemeAppearance } from '../themeAppearance';

describe('servers/preload/themeAppearance', () => {
  it('keeps compatibility call as a no-op', () => {
    expect(() => setUserThemeAppearance('dark')).not.toThrow();
  });
});
