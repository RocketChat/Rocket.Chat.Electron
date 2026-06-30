import { Box, IconButton } from '@rocket.chat/fuselage';

type TabProps = {
  channelName: string;
  isActive?: boolean;
  onClose?: () => void;
  onClick?: () => void;
};

export const Tab = ({
  channelName,
  isActive = false,
  onClose,
  onClick,
}: TabProps) => (
  <Box
    display='flex'
    alignItems='center'
    justifyContent='center'
    position='relative'
    height='x36'
    minWidth='x120'
    maxWidth='x200'
    paddingInline='x12'
    bg={isActive ? 'surface-selected' : 'surface-tint'}
    borderBlockEndWidth='x2'
    borderBlockEndStyle='solid'
    borderBlockEndColor={isActive ? 'error' : undefined}
    style={{
      cursor: 'pointer',
      userSelect: 'none',
      borderBlockEndColor: isActive ? undefined : 'transparent',
    }}
    onClick={onClick}
  >
    <Box
      flexGrow={1}
      textAlign='center'
      fontScale='p2m'
      color={isActive ? 'titles-labels' : 'secondary-info'}
      overflow='hidden'
      style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      #{channelName}
    </Box>

    <Box insetInlineEnd='x4'>
      <IconButton
        icon='cross-small'
        tiny
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        aria-label={`Close ${channelName}`}
      />
    </Box>
  </Box>
);
