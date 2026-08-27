import { Box } from '@rocket.chat/fuselage';

/**
 * Hairline between groups of settings inside one section — the update controls
 * apart from the rest of General, logging apart from the rest of Advanced.
 *
 * A rule rather than more whitespace: spacing alone reads as an accident of
 * layout once a group runs to several rows, while a line says the grouping is
 * deliberate.
 */
export const SettingGroupDivider = () => (
  <Box
    marginBlock='x24'
    style={{
      height: '1px',
      backgroundColor: 'var(--rcx-color-stroke-extra-light)',
    }}
  />
);
