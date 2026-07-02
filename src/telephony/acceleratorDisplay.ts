const MODIFIER_LABELS: Record<string, string> = {
  command: 'Cmd',
  cmd: 'Cmd',
  control: 'Ctrl',
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  option: 'Option',
  meta: 'Meta',
  super: 'Super',
  altgr: 'AltGr',
};

const MAC_LABEL_OVERRIDES: Record<string, string> = {
  commandorcontrol: 'Cmd',
  meta: 'Cmd',
  super: 'Cmd',
  alt: 'Option',
};

const NON_MAC_LABEL_OVERRIDES: Record<string, string> = {
  commandorcontrol: 'Ctrl',
};

type FormatOptions = {
  platform?: NodeJS.Platform;
};

export const formatAcceleratorForDisplay = (
  accelerator: string | null | undefined,
  { platform = process.platform }: FormatOptions = {}
): string => {
  if (!accelerator) return '';

  const isMac = platform === 'darwin';
  const overrides = isMac ? MAC_LABEL_OVERRIDES : NON_MAC_LABEL_OVERRIDES;

  const parts = accelerator
    .split('+')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (overrides[lower]) return overrides[lower];
      if (MODIFIER_LABELS[lower]) return MODIFIER_LABELS[lower];
      return part.length === 1 ? part.toUpperCase() : part;
    });

  return parts.join('+');
};
