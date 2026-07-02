import {
  Field,
  FieldRow,
  FieldLabel,
  FieldDescription,
  FieldHint,
  ToggleSwitch,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, ComponentProps, ReactNode } from 'react';

type ToggleFieldProps = {
  id: string;
  label: ReactNode;
  description: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** escape hatch for extras (Callout, InputBox) rendered after the hint */
  children?: ReactNode;
} & Pick<
  ComponentProps<typeof Field>,
  'className' | 'marginBlock' | 'marginBlockStart'
>;

/**
 * Shared layout for a toggle-style settings row. Pairs a label with a
 * ToggleSwitch on one row, then stacks the description and optional hint as
 * left-aligned block elements below. Centralizes the canonical Fuselage
 * label / description / hint vertical rhythm so every toggle row stays
 * consistent.
 */
export const ToggleField = ({
  id,
  label,
  description,
  hint,
  checked,
  onChange,
  disabled,
  children,
  className,
  marginBlock,
  marginBlockStart,
}: ToggleFieldProps) => (
  <Field
    className={className}
    marginBlock={marginBlock}
    marginBlockStart={marginBlockStart}
  >
    <FieldRow>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ToggleSwitch
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </FieldRow>
    <FieldDescription>{description}</FieldDescription>
    {hint && <FieldHint>{hint}</FieldHint>}
    {children}
  </Field>
);
