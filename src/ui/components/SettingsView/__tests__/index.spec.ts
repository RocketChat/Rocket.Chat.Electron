jest.mock('../SettingsView', () => ({
  SettingsView: 'MockSettingsView',
}));

const { SettingsView } = require('..');

describe('SettingsView exports', () => {
  it('re-exports SettingsView', () => {
    expect(SettingsView).toBe('MockSettingsView');
  });
});
