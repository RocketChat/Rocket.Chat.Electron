export const MAX_CLIPBOARD_PHONE_LENGTH = 256;
export const MAX_TELEPHONY_SHORTCUT_ACCELERATOR_LENGTH = 64;

const normalizeAccelerator = (accelerator: string): string =>
  accelerator
    .replace(/\s+/g, '')
    .replace(/cmd/gi, 'command')
    .replace(/ctrl/gi, 'control')
    .toLowerCase();

const RESERVED_ACCELERATORS = new Set(
  ['C', 'V', 'X', 'A', 'Z', 'Q', 'W', 'N', ','].flatMap((key) => [
    `commandorcontrol+${key.toLowerCase()}`,
    `command+${key.toLowerCase()}`,
    `control+${key.toLowerCase()}`,
  ])
);

export const normalizeTelephonyShortcutAccelerator = (
  accelerator: unknown
): string | null => {
  if (typeof accelerator !== 'string') {
    return null;
  }

  const trimmedAccelerator = accelerator.trim();
  if (
    !trimmedAccelerator ||
    trimmedAccelerator.length > MAX_TELEPHONY_SHORTCUT_ACCELERATOR_LENGTH
  ) {
    return null;
  }

  return trimmedAccelerator;
};

export const isReservedTelephonyShortcutAccelerator = (
  accelerator: string
): boolean => RESERVED_ACCELERATORS.has(normalizeAccelerator(accelerator));
