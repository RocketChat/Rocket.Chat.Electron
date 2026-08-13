import { Box, Icon } from '@rocket.chat/fuselage';
import type { Keys as IconName } from '@rocket.chat/icons';

export type SidebarPlaceholderProps = {
  icon: IconName;
  children: string;
};

/**
 * Stands in for the filter sections while there is nothing to filter.
 *
 * Without it the sidebar reads as a rendering failure — a search field over an
 * empty column — rather than as a list that has not been populated yet.
 */
export const SidebarPlaceholder = ({
  icon,
  children,
}: SidebarPlaceholderProps) => (
  <Box
    display='flex'
    flexDirection='column'
    alignItems='center'
    justifyContent='center'
    height='100%'
    paddingInline='x24'
    paddingBlock='x32'
  >
    <Icon name={icon} size='x24' color='annotation' />
    <Box
      marginBlockStart='x8'
      fontScale='c1'
      color='annotation'
      style={{ textAlign: 'center' }}
    >
      {children}
    </Box>
  </Box>
);
