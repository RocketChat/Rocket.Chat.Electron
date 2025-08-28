import React, { useId } from 'react';
import type { ChangeEvent } from 'react';

import { 
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
  ToggleSwitch 
} from '@rocket.chat/fuselage';

interface MemoryToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const MemoryToggle: React.FC<MemoryToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  const toggleId = useId();
  
  return (
    <Field>
      <FieldRow>
        <FieldLabel htmlFor={toggleId}>
          {label}
        </FieldLabel>
        <ToggleSwitch
          id={toggleId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {description}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};