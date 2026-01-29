import { Box, Badge, Chip } from '@rocket.chat/fuselage';

import { type LogLevel, type LogEntryType } from './types';

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

const getLevelBackgroundColor = (level: LogLevel): string => {
  switch (level) {
    case 'error':
      return 'surface-light';
    case 'warn':
      return 'surface-light';
    case 'info':
      return 'surface-light';
    case 'debug':
      return 'surface-light';
    case 'verbose':
      return 'surface-light';
    default:
      return 'surface-light';
  }
};

const getLevelTextColor = (level: LogLevel): string => {
  // Match text colors to badge BACKGROUND colors:
  // error → danger badge background (red) → red text
  // warn → warning badge background (orange) → default text (no orange font token)
  // info → primary badge background (blue) → blue text
  // debug/verbose → secondary badge background (gray) → gray text

  switch (level) {
    case 'error':
      return 'font-danger'; // Red text (#ec0d2a) matching red danger badge
    case 'warn':
      return 'font-default'; // Default text color for warnings
    case 'info':
      return 'font-info'; // Blue text (#095ad2) matching blue primary badge
    case 'debug':
      return 'font-default'; // Default text matching gray secondary badge
    case 'verbose':
      return 'font-default'; // Default text matching gray secondary badge
    default:
      return 'font-default';
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
}: {
  entry: LogEntryType;
  showContext: boolean;
}) => {
  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='flex-start'
      padding='x12'
      borderBlockEnd='1px solid var(--rcx-color-stroke-light)'
      backgroundColor={getLevelBackgroundColor(entry.level)}
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
      {showContext && entry.context && (
        <Box marginInlineEnd='x12'>
          <Chip>{entry.context}</Chip>
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
