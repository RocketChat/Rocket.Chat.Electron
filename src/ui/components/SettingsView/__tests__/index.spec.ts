import { SettingsView } from '..';

jest.mock('../SettingsView', () => ({
  SettingsView: 'MockSettingsView',
}));

describe('SettingsView exports', () => {
  it('re-exports SettingsView', () => {
    expect(SettingsView).toBe('MockSettingsView');
  });
});
