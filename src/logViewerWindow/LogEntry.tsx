import { Badge, Box, IconButton, Tag } from '@rocket.chat/fuselage';
import type { MouseEvent, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Surfaces } from '../ui/windowChrome/appearance';
import { useCopiedFeedback } from '../ui/windowChrome/useCopiedFeedback';
import { LEVEL_ACCENT, LEVEL_BADGE_VARIANT } from './appearance';
import { getEntryTime } from './parseLogs';
import { LOG_MARK_CLASS, LOG_ROW_ACTIONS_CLASS, LOG_ROW_CLASS } from './styles';
import type { LogEntryType } from './types';

/**
 * Tags sit on their own line above the message and wrap, so the only cap needed
 * is one that stops a single very long server title from filling the line.
 */
const TRUNCATED_TAG_STYLE = {
  display: 'block',
  maxWidth: '360px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

/** Wraps every case-insensitive occurrence of `term` in a <mark>. */
const highlightMatches = (text: string, term: string): ReactNode => {
  if (!term) {
    return text;
  }

  const haystack = text.toLowerCase();
  const needle = term.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match = haystack.indexOf(needle);

  while (match !== -1) {
    if (match > cursor) {
      parts.push(text.slice(cursor, match));
    }
    parts.push(
      <mark key={`${match}`} className={LOG_MARK_CLASS}>
        {text.slice(match, match + needle.length)}
      </mark>
    );
    cursor = match + needle.length;
    match = haystack.indexOf(needle, cursor);
  }

  if (parts.length === 0) {
    return text;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
};

export type LogEntryProps = {
  entry: LogEntryType;
  showContext: boolean;
  showServer: boolean;
  serverMapping: Record<string, string>;
  searchTerm: string;
  wrapLines: boolean;
  /** Whether multi-line entries fold at all — the "Collapse multi-line" toggle. */
  collapseEnabled: boolean;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
  onCopy: (entry: LogEntryType) => void;
  surfaces: Surfaces;
};

export const LogEntry = ({
  entry,
  showContext,
  showServer,
  serverMapping,
  searchTerm,
  wrapLines,
  collapseEnabled,
  isExpanded,
  onToggleExpanded,
  onCopy,
  surfaces,
}: LogEntryProps) => {
  const { t } = useTranslation();

  /**
   * The first non-server tag is the process (`main`, `renderer:webview`) and
   * gets a fixed column, so the message always starts at the same offset. The
   * remaining tags trail the message instead of shoving it rightwards.
   */
  const { serverName, processTag, trailingTags } = useMemo(() => {
    const serverTag = entry.contextTags.find((tag) => tag in serverMapping);
    const contextTags = entry.contextTags.filter((tag) => tag !== serverTag);
    const [process, ...rest] = contextTags;
    return {
      serverName: serverTag ? serverMapping[serverTag] || serverTag : '',
      processTag: process ?? '',
      trailingTags: rest,
    };
  }, [entry.contextTags, serverMapping]);

  const hasTags =
    (showContext && (processTag !== '' || trailingTags.length > 0)) ||
    (showServer && serverName !== '');

  const lines = useMemo(() => entry.message.split('\n'), [entry.message]);
  const hiddenLineCount = lines.length - 1;
  const isFoldable = collapseEnabled && hiddenLineCount > 0;
  const isFolded = isFoldable && !isExpanded;
  const visibleMessage = isFolded ? lines[0] : entry.message;

  const [hasCopied, acknowledgeCopy] = useCopiedFeedback();

  const handleCopy = (event: MouseEvent<HTMLElement>): void => {
    event.stopPropagation();
    onCopy(entry);
    acknowledgeCopy();
  };

  return (
    <Box
      className={LOG_ROW_CLASS}
      display='flex'
      flexDirection='row'
      alignItems='flex-start'
      paddingBlock='x8'
      paddingInlineEnd='x8'
      fontFamily='mono'
      // Fuselage 0.80.0 has no mono fontScale; keep the code scale here.
      fontSize='x12'
      lineHeight='x16'
      style={{
        borderBlockEnd: `1px solid ${surfaces.divider}`,
        borderInlineStart: `1px solid ${LEVEL_ACCENT[entry.level]}`,
        paddingInlineStart: '11px',
      }}
    >
      <Box
        flexShrink={0}
        width='x88'
        marginInlineEnd='x8'
        color='hint'
        fontSize='x11'
        title={entry.timestamp}
        style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
      >
        {getEntryTime(entry.timestamp)}
      </Box>
      <Box flexShrink={0} width='x56' marginInlineEnd='x8'>
        <Badge variant={LEVEL_BADGE_VARIANT[entry.level]}>
          {entry.level.toUpperCase()}
        </Badge>
      </Box>
      <Box flexGrow={1} style={{ minWidth: 0 }}>
        {hasTags && (
          <Box
            display='flex'
            flexWrap='wrap'
            alignItems='center'
            marginBlockEnd='x4'
            style={{ gap: '4px' }}
          >
            {showContext && processTag && (
              <Tag title={processTag} style={TRUNCATED_TAG_STYLE}>
                {processTag}
              </Tag>
            )}
            {showServer && serverName && (
              <Tag
                variant='secondary-info'
                title={serverName}
                style={TRUNCATED_TAG_STYLE}
              >
                {serverName}
              </Tag>
            )}
            {showContext &&
              trailingTags.map((tag) => (
                <Tag key={tag} title={tag} style={TRUNCATED_TAG_STYLE}>
                  {tag}
                </Tag>
              ))}
          </Box>
        )}
        <Box
          color={entry.level === 'error' ? 'danger' : 'default'}
          style={{
            whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
            overflowX: wrapLines ? 'visible' : 'auto',
            overflowWrap: wrapLines ? 'anywhere' : 'normal',
          }}
        >
          {highlightMatches(visibleMessage, searchTerm)}
        </Box>
        {isFoldable && (
          <Box
            is='button'
            type='button'
            marginBlockStart='x4'
            fontScale='micro'
            color='info'
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
            onClick={() => onToggleExpanded(entry.id)}
          >
            {isFolded
              ? t('logViewer.entry.expand', { count: hiddenLineCount })
              : t('logViewer.entry.collapse')}
          </Box>
        )}
      </Box>
      <Box
        className={LOG_ROW_ACTIONS_CLASS}
        flexShrink={0}
        marginInlineStart='x8'
      >
        <IconButton
          tiny
          icon={hasCopied ? 'check' : 'copy'}
          title={
            hasCopied
              ? t('logViewer.entry.copied')
              : t('logViewer.entry.copyEntry')
          }
          aria-label={
            hasCopied
              ? t('logViewer.entry.copied')
              : t('logViewer.entry.copyEntry')
          }
          onClick={handleCopy}
        />
      </Box>
    </Box>
  );
};
