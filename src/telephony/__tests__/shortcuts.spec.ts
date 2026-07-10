import {
  isReservedTelephonyShortcutAccelerator,
  normalizeTelephonyShortcutAccelerator,
} from '../shortcuts';

describe('normalizeTelephonyShortcutAccelerator', () => {
  it('returns null for non-string values', () => {
    expect(normalizeTelephonyShortcutAccelerator(undefined)).toBeNull();
    expect(normalizeTelephonyShortcutAccelerator(null)).toBeNull();
    expect(normalizeTelephonyShortcutAccelerator(123)).toBeNull();
  });

  it('returns null for empty values and too long accelerators', () => {
    expect(normalizeTelephonyShortcutAccelerator('   ')).toBeNull();
    expect(normalizeTelephonyShortcutAccelerator('a'.repeat(65))).toBeNull();
  });

  it('trims input and returns unchanged for valid values', () => {
    expect(normalizeTelephonyShortcutAccelerator('  CmdOrCtrl+K  ')).toBe(
      'CmdOrCtrl+K'
    );
  });
});

describe('isReservedTelephonyShortcutAccelerator', () => {
  it('detects reserved accelerators', () => {
    expect(isReservedTelephonyShortcutAccelerator('command+q')).toBe(true);
    expect(isReservedTelephonyShortcutAccelerator('Ctrl+Z')).toBe(true);
  });

  it('does not flag non-reserved accelerators', () => {
    expect(isReservedTelephonyShortcutAccelerator('shift+alt+1')).toBe(false);
  });
});
