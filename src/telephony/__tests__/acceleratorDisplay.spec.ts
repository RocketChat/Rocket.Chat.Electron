import { formatAcceleratorForDisplay } from '../acceleratorDisplay';

describe('formatAcceleratorForDisplay', () => {
  it('returns empty string for missing accelerators', () => {
    expect(formatAcceleratorForDisplay(null)).toBe('');
    expect(formatAcceleratorForDisplay(undefined)).toBe('');
  });

  it('formats modifiers and keys with display labels', () => {
    expect(formatAcceleratorForDisplay('command+shift+p')).toBe('Cmd+Shift+P');
    expect(
      formatAcceleratorForDisplay('control+alt+p', { platform: 'darwin' })
    ).toBe('Ctrl+Option+P');
    expect(formatAcceleratorForDisplay('meta+option+p')).toBe('Cmd+Option+P');
  });

  it('uses mac overrides by default when platform is darwin', () => {
    expect(
      formatAcceleratorForDisplay('commandorcontrol+q', { platform: 'darwin' })
    ).toBe('Cmd+Q');
    expect(formatAcceleratorForDisplay('commandorcontrol+q')).toBe('Cmd+Q');
  });

  it('uses non-mac overrides by default on other platforms', () => {
    expect(
      formatAcceleratorForDisplay('commandorcontrol+q', { platform: 'win32' })
    ).toBe('Ctrl+Q');
    expect(formatAcceleratorForDisplay('meta+q', { platform: 'win32' })).toBe(
      'Meta+Q'
    );
  });
});
