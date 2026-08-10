import { Box, CheckBox } from '@rocket.chat/fuselage';
import type { KeyboardEvent, MouseEvent } from 'react';
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
 * A checkbox filter whose entire row is the hit target.
 *
 * Clicks on the checkbox are kept from reaching the row. Fuselage draws it as a
 * label wrapping a real input, so a click on the visible box reaches the row
 * twice — once on its way up from the box, once from the click the label
 * forwards to the input — and the filter toggled straight back to where it
 * started. The checkbox reports its own change instead, and the row handles
 * everywhere else.
 */
export const FilterRow = ({
  label,
  title,
  count,
  checked,
  accent,
  onToggle,
}: FilterRowProps) => {
  const handleCheckBoxClick = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

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
      <Box
        display='flex'
        alignItems='center'
        flexShrink={0}
        onClick={handleCheckBoxClick}
      >
        <CheckBox
          checked={checked}
          onChange={onToggle}
          tabIndex={-1}
          // The row is the control as far as assistive tech is concerned; this
          // is its rendering, not a second checkbox to announce.
          aria-hidden
        />
      </Box>
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
          color='secondary-info'
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
