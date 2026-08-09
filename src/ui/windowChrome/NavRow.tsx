import { Box, Icon } from '@rocket.chat/fuselage';
import type { Keys as IconName } from '@rocket.chat/icons';
import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';

import type { Surfaces } from './appearance';
import { FILTER_ROW_CLASS } from './styles';

export type NavRowProps = {
  label: string;
  /** Secondary line, e.g. why a search matched this row. */
  description?: string;
  icon?: IconName;
  isSelected: boolean;
  surfaces: Surfaces;
  onSelect: () => void;
};

/**
 * A selectable sidebar row, for windows whose sidebar navigates sections rather
 * than filtering a list. Shares the filter row's hover treatment so both kinds
 * of sidebar feel the same.
 */
export const NavRow = ({
  label,
  description,
  icon,
  isSelected,
  surfaces,
  onSelect,
}: NavRowProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onSelect();
      }
    },
    [onSelect]
  );

  return (
    <Box
      role='tab'
      aria-selected={isSelected}
      tabIndex={0}
      display='flex'
      alignItems='center'
      paddingBlock='x6'
      paddingInline='x8'
      marginInline='neg-x4'
      marginBlockEnd='x2'
      borderRadius='x4'
      className={FILTER_ROW_CLASS}
      title={label}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? surfaces.selected : undefined,
      }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {icon && (
        <Icon
          name={icon}
          size='x16'
          color={isSelected ? 'default' : 'hint'}
          marginInlineEnd='x8'
        />
      )}
      <Box flexGrow={1} style={{ minWidth: 0 }}>
        <Box
          fontScale='p2'
          color={isSelected ? 'default' : 'hint'}
          withTruncatedText
        >
          {label}
        </Box>
        {description && (
          <Box fontScale='micro' color='annotation' withTruncatedText>
            {description}
          </Box>
        )}
      </Box>
    </Box>
  );
};
