import React from 'react';

import { Box, ToggleSwitch } from '@rocket.chat/fuselage';

interface MemoryToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const MemoryToggle: React.FC<MemoryToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <Box 
      display='flex' 
      alignItems='center' 
      justifyContent='space-between' 
      marginBlockEnd='x16'
      padding='x12'
      borderRadius='x4'
      backgroundColor='surface-light'
    >
      <Box flexGrow={1} marginInlineEnd='x16'>
        <Box fontScale='p2' fontWeight='600' marginBlockEnd='x4'>
          {label}
        </Box>
        <Box fontScale='c1' color='hint'>
          {description}
        </Box>
      </Box>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </Box>
  );
};