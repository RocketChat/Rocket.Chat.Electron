import { Box, CheckBox } from '@rocket.chat/fuselage';
import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';

import { FILTER_ROW_CLASS } from './styles';

export type FilterRowProps = {
  label: string;
  title?: string;
  count?: number;
  checked: boolean;
  accent?: string;
  onToggle: () => void;
};

/**
 * A checkbox filter whose entire row is the hit target. The checkbox itself is
 * inert — letting it handle its own click as well would toggle the filter twice
 * and cancel itself out.
 */
export const FilterRow = ({
  label,
  title,
  count,
  checked,
  accent,
  onToggle,
}: FilterRowProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  return (
    <Box
      role='checkbox'
      aria-checked={checked}
      tabIndex={0}
      display='flex'
      alignItems='center'
      paddingBlock='x4'
      paddingInline='x4'
      marginInline='neg-x4'
      borderRadius='x4'
      title={title ?? label}
      className={FILTER_ROW_CLASS}
      style={{ cursor: 'pointer' }}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <CheckBox
        checked={checked}
        readOnly
        tabIndex={-1}
        aria-hidden
        style={{ pointerEvents: 'none' }}
      />
      {accent && (
        <Box
          width='x8'
          height='x8'
          borderRadius='full'
          marginInlineStart='x8'
          flexShrink={0}
          style={{ backgroundColor: accent }}
        />
      )}
      <Box
        flexGrow={1}
        marginInlineStart='x8'
        fontScale='p2'
        color='default'
        withTruncatedText
      >
        {label}
      </Box>
      {count !== undefined && (
        <Box
          fontScale='micro'
          color='annotation'
          marginInlineStart='x4'
          flexShrink={0}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {count}
        </Box>
      )}
    </Box>
  );
};
