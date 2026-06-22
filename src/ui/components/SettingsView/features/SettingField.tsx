import { Box, Field, FieldHint, FieldLabel } from '@rocket.chat/fuselage';
import type { ComponentProps, ReactNode } from 'react';

type SettingFieldProps = {
  /** id of the control; wired to the label via htmlFor */
  htmlFor?: string;
  label: ReactNode;
  hint: ReactNode;
  /** the control rendered on the right (Select, InputBox, etc.) */
  children: ReactNode;
} & Pick<ComponentProps<typeof Field>, 'className' | 'marginBlock'>;

/**
 * Shared layout for a settings row that pairs a label + description on the
 * left with a fixed-width control on the right. Centralizes the column
 * widths and optical alignment so every row stays consistent.
 */
export const SettingField = ({
  htmlFor,
  label,
  hint,
  children,
  className,
  marginBlock,
}: SettingFieldProps) => (
  <Field className={className} marginBlock={marginBlock}>
    <Box
      display='flex'
      flexDirection='row'
      justifyContent='space-between'
      alignItems='flex-start'
    >
      <Box display='flex' flexDirection='column'>
        <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
        <FieldHint>{hint}</FieldHint>
      </Box>
      <Box
        display='flex'
        alignItems='center'
        justifyContent='flex-end'
        flexShrink={0}
        width='x220'
        paddingBlockStart='x4'
      >
        {children}
      </Box>
    </Box>
  </Field>
);
