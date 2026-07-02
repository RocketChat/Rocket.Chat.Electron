import {
  Box,
  Field,
  FieldDescription,
  FieldHint,
  FieldLabel,
} from '@rocket.chat/fuselage';
import type { ComponentProps, ReactNode } from 'react';

type SettingFieldProps = {
  /** id of the control; wired to the label via htmlFor */
  htmlFor?: string;
  label: ReactNode;
  description: ReactNode;
  hint?: ReactNode;
  /** the control rendered below the description (and optional hint) */
  children: ReactNode;
} & Pick<ComponentProps<typeof Field>, 'className' | 'marginBlock'>;

/**
 * Shared layout for a settings row that stacks a label, then a description,
 * then an optional hint, then the control below it in a single left-aligned
 * column. Centralizes the canonical Fuselage label / description / hint
 * vertical rhythm so every row stays consistent.
 */
export const SettingField = ({
  htmlFor,
  label,
  description,
  hint,
  children,
  className,
  marginBlock,
}: SettingFieldProps) => (
  <Field className={className} marginBlock={marginBlock}>
    <Box display='flex' flexDirection='column' alignItems='stretch'>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      {hint && <FieldHint>{hint}</FieldHint>}
      <Box display='flex' width='full' paddingBlockStart='x4'>
        {children}
      </Box>
    </Box>
  </Field>
);
