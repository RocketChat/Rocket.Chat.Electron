import { Avatar, Box } from '@rocket.chat/fuselage';
import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';

type ServerItemProps = {
  url: string;
  title?: string;
  favicon?: string | null;
  onClick: () => void;
};

export const ServerItem = ({
  url,
  title,
  favicon,
  onClick,
}: ServerItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const displayTitle = title ?? new URL(url).hostname;
  const { hostname } = new URL(url);

  const initials = useMemo(
    () =>
      (title ?? hostname)
        ?.replace(url, hostname)
        ?.split(/[^A-Za-z0-9]+/g)
        ?.slice(0, 2)
        ?.map((text) => text.slice(0, 1).toUpperCase())
        ?.join(''),
    [title, url, hostname]
  );

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    onClick();
  };

  return (
    <Box
      is='button'
      type='button'
      paddingBlock='x6'
      paddingInline='x8'
      display='flex'
      alignItems='center'
      style={{
        cursor: 'pointer',
        borderRadius: '4px',
        backgroundColor: isHovered
          ? 'var(--rcx-color-surface-hover)'
          : 'transparent',
        transition: 'background-color 0.2s',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        display='flex'
        alignItems='center'
        justifyContent='center'
        width='x36'
        height='x36'
        borderRadius='x4'
        overflow='hidden'
        flexShrink={0}
      >
        {favicon ? (
          <Avatar url={favicon} size='x36' />
        ) : (
          <Box
            display='flex'
            alignItems='center'
            justifyContent='center'
            width='x36'
            height='x36'
            color='white'
            fontScale='p2b'
            borderRadius='x4'
            style={{ backgroundColor: 'var(--rcx-color-neutral-400, #9ea2a8)' }}
          >
            {initials}
          </Box>
        )}
      </Box>
      <Box marginInlineStart='x12' flexGrow={1} overflow='hidden'>
        <Box fontScale='p2b' color='default' withTruncatedText>
          {displayTitle}
        </Box>
        <Box fontScale='c1' color='hint' withTruncatedText>
          {hostname}
        </Box>
      </Box>
    </Box>
  );
};
