import { Box, Badge, Chip } from '@rocket.chat/fuselage';
import { useMemo } from 'react';

import { type LogLevel, type LogEntryType } from './types';

/**
 * Find the server hostname tag in a context string by matching against
 * known hostnames from the server mapping.
 */
const findServerTag = (
  context: string,
  serverMapping: Record<string, string>
): string => {
  const contextTags = context.split(/\s+/);
  const hostnames = Object.keys(serverMapping);
  return contextTags.find((tag) => hostnames.includes(tag)) || '';
};

const getLevelColor = (
  level: LogLevel
): 'danger' | 'warning' | 'primary' | 'secondary' | 'ghost' => {
  switch (level) {
    case 'error':
      return 'danger';
    case 'warn':
      return 'warning';
    case 'info':
      return 'primary';
    case 'debug':
      return 'secondary';
    case 'verbose':
      return 'ghost';
    default:
      return 'ghost';
  }
};

const getLevelTextColor = (level: LogLevel): string => {
  switch (level) {
    case 'error':
      return 'danger';
    case 'warn':
      return 'default';
    case 'info':
      return 'info';
    case 'debug':
      return 'default';
    case 'verbose':
      return 'default';
    default:
      return 'default';
  }
};

const getLevelBorderColor = (level: LogLevel): string => {
  switch (level) {
    case 'error':
      return 'var(--rcx-color-stroke-highlight)';
    case 'warn':
      return 'var(--rcx-color-stroke-highlight)';
    case 'info':
      return 'var(--rcx-color-stroke-highlight)';
    case 'debug':
      return 'var(--rcx-color-stroke-light)';
    case 'verbose':
      return 'var(--rcx-color-stroke-light)';
    default:
      return 'var(--rcx-color-stroke-light)';
  }
};

export const LogEntry = ({
  entry,
  showContext,
  showServer,
  serverMapping,
}: {
  entry: LogEntryType;
  showContext: boolean;
  showServer: boolean;
  serverMapping: Record<string, string>;
}) => {
  const { serverTag, serverDisplayName, contextWithoutServer } = useMemo(() => {
    const tag = findServerTag(entry.context, serverMapping);
    const displayName = tag ? serverMapping[tag] || tag : '';
    const ctxWithout = tag
      ? entry.context
          .replace(tag, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      : entry.context;
    return {
      serverTag: tag,
      serverDisplayName: displayName,
      contextWithoutServer: ctxWithout,
    };
  }, [entry.context, serverMapping]);

  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='flex-start'
      padding='x12'
      borderBlockEnd='1px solid var(--rcx-color-stroke-light)'
      backgroundColor='surface-light'
      borderInlineStart={`4px solid ${getLevelBorderColor(entry.level)}`}
      fontFamily='mono'
      fontSize='x12'
      lineHeight='x16'
    >
      <Box
        minWidth='x140'
        marginInlineEnd='x12'
        color='hint'
        fontWeight='normal'
        fontSize='x11'
        style={{ whiteSpace: 'nowrap' }}
      >
        {entry.timestamp}
      </Box>
      <Box marginInlineEnd='x12'>
        <Badge variant={getLevelColor(entry.level)}>
          {entry.level.toUpperCase()}
        </Badge>
      </Box>
      {showServer && serverTag && (
        <Box marginInlineEnd='x12'>
          <Chip>{serverDisplayName}</Chip>
        </Box>
      )}
      {showContext && contextWithoutServer && (
        <Box marginInlineEnd='x12'>
          <Chip>{contextWithoutServer}</Chip>
        </Box>
      )}
      <Box
        flexGrow={1}
        wordBreak='break-word'
        style={{ whiteSpace: 'pre-wrap' }}
        color={getLevelTextColor(entry.level)}
        fontWeight='normal'
      >
        {entry.message}
      </Box>
    </Box>
  );
};
