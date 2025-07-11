import {
  Box,
  SearchInput,
  Icon,
  Pagination,
  Scrollable,
  Button,
  ButtonGroup,
  SelectLegacy,
  Tile,
  Throbber,
  Badge,
} from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import { ipcRenderer } from 'electron';
import type { ChangeEvent } from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'verbose';

type LogEntryType = {
  id: string;
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  raw: string;
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
  switch (level) {
    case 'error':
      return 'danger';
    case 'warn':
      return 'danger';
    case 'info':
      return 'default';
    case 'debug':
      return 'hint';
    case 'verbose':
      return 'hint';
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

const LogEntry = ({ entry }: { entry: LogEntryType }) => {
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
      >
        {entry.timestamp}
      </Box>
      <Box marginInlineEnd='x12'>
        <Badge variant={getLevelColor(entry.level)}>
          {entry.level.toUpperCase()}
        </Badge>
      </Box>
      {entry.context && (
        <Box
          marginInlineEnd='x12'
          color='hint'
          fontWeight='bold'
          minWidth='x120'
          fontSize='x11'
          backgroundColor='surface-tint'
          padding='x4'
          borderRadius='x2'
        >
          [{entry.context}]
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

function LogViewerWindow() {
  const { t } = useTranslation();

  const [searchFilter, setSearchFilter] = useLocalStorage('log-search', '');
  const [logEntries, setLogEntries] = useState<LogEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleSearchFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchFilter(event.target.value);
    },
    [setSearchFilter]
  );

  const levelFilterOptions = useMemo<[LogLevel | 'all', string][]>(
    () => [
      ['all', 'All Levels'],
      ['debug', 'Debug'],
      ['info', 'Info'],
      ['warn', 'Warning'],
      ['error', 'Error'],
      ['verbose', 'Verbose'],
    ],
    []
  );

  const [levelFilter, setLevelFilter] = useLocalStorage<
    (typeof levelFilterOptions)[number][0]
  >('log-level', 'all');

  const handleLevelFilterChange = useCallback(
    (value: string) => {
      setLevelFilter(value as LogLevel | 'all');
    },
    [setLevelFilter]
  );

  const contextFilterOptions = useMemo<[string, string][]>(
    () => [
      ['all', 'All Contexts'],
      ['main', 'Main Process'],
      ['renderer', 'Renderer'],
      ['webview', 'Webview'],
      ['videocall', 'Video Call'],
    ],
    []
  );

  const [contextFilter, setContextFilter] = useLocalStorage<
    (typeof contextFilterOptions)[number][0]
  >('log-context', 'all');

  const handleContextFilterChange = useCallback(
    (value: string) => {
      setContextFilter(value);
    },
    [setContextFilter]
  );

  const handleClearAll = useCallback((): void => {
    setSearchFilter('');
    setLevelFilter('all');
    setContextFilter('all');
  }, [setSearchFilter, setLevelFilter, setContextFilter]);

  const [itemsPerPage, setItemsPerPage] = useState<25 | 50 | 100>(50);
  const [currentPagination, setCurrentPagination] = useState(0);

  const showingResultsLabel = useCallback(
    ({
      count,
      current,
      itemsPerPage,
    }: {
      count: number;
      current: number;
      itemsPerPage: number;
    }) =>
      `Showing ${current + 1}-${Math.min(current + itemsPerPage, count)} of ${count} entries`,
    []
  );

  // Parse log lines into structured format, grouping multi-line entries
  const parseLogLines = useCallback((logText: string): LogEntryType[] => {
    const lines = logText.split('\n').filter((line: string) => line.trim());
    const entries: LogEntryType[] = [];
    let currentEntry: LogEntryType | null = null;

    lines.forEach((line, index) => {
      // Match the actual electron-log format: [timestamp] [level] message
      const logRegex = /^\[([^\]]+)\] \[([^\]]+)\]\s*(.*)$/;
      const match = line.match(logRegex);

      if (match) {
        // This is a new log entry
        const [, timestamp, level, rest] = match;

        // Check if the message contains context information in brackets
        const contextMatch = rest.match(
          /^(\[[^\]]+\](?:\s*\[[^\]]+\])*)\s*(.*)$/
        );
        const context = contextMatch?.[1] || '';
        const message = contextMatch?.[2] || rest;

        // Save the previous entry if it exists
        if (currentEntry) {
          entries.push(currentEntry);
        }

        // Create new entry
        currentEntry = {
          id: `log-${entries.length}`,
          timestamp,
          level: level.trim() as LogLevel,
          context: context.replace(/[\[\]]/g, ' ').trim(),
          message: message.trim(),
          raw: line,
        };
      } else if (currentEntry && line.trim()) {
        // This is a continuation line (stack trace, etc.)
        currentEntry.message += `\n${line}`;
        currentEntry.raw += `\n${line}`;
      }
    });

    // Add the last entry
    if (currentEntry) {
      entries.push(currentEntry);
    }

    // Return newest first (reverse order)
    return entries.reverse();
  }, []);

  // Load logs from file
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ipcRenderer.invoke('log-viewer-window/read-logs');
      if (response?.success && response.logs) {
        const parsedLogs = parseLogLines(response.logs);
        setLogEntries(parsedLogs);
      } else {
        console.error('Failed to load logs:', response?.error);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parseLogLines]);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logEntries.filter((entry) => {
      const matchesSearch =
        !searchFilter ||
        entry.message.toLowerCase().includes(searchFilter.toLowerCase()) ||
        entry.context.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesLevel = levelFilter === 'all' || entry.level === levelFilter;

      const matchesContext =
        contextFilter === 'all' ||
        entry.context.toLowerCase().includes(contextFilter.toLowerCase());

      return matchesSearch && matchesLevel && matchesContext;
    });
  }, [logEntries, searchFilter, levelFilter, contextFilter]);

  // Pagination
  // Load logs on component mount
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Auto-refresh logs every 5 seconds when streaming is enabled
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [isStreaming, loadLogs]);

  const paginatedLogs = useMemo(() => {
    const startIndex = currentPagination * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPagination, itemsPerPage]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [paginatedLogs, autoScroll]);

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRefresh = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearLogs = useCallback(async () => {
    try {
      const response = await ipcRenderer.invoke('log-viewer-window/clear-logs');
      if (response?.success) {
        setLogEntries([]);
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }, []);

  const handleToggleStreaming = useCallback(() => {
    setIsStreaming(!isStreaming);
    // TODO: Implement real-time log streaming
  }, [isStreaming]);

  const handleCopyLogs = useCallback(() => {
    const logText = filteredLogs.map((entry) => entry.raw).join('\n');
    navigator.clipboard.writeText(logText);
  }, [filteredLogs]);

  const handleClose = useCallback(() => {
    ipcRenderer.invoke('log-viewer-window/close-requested');
  }, []);

  return (
    <Box
      display='flex'
      flexDirection='column'
      height='100vh'
      width='100%'
      backgroundColor='surface-light'
    >
      <Box
        minHeight='x64'
        padding='x24'
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
        borderBlockEnd='1px solid var(--rcx-color-stroke-light)'
        backgroundColor='surface-tint'
      >
        <Box
          display='flex'
          flexDirection='row'
          alignItems='center'
          flexGrow={1}
        >
          <Icon name='list-alt' size='x20' color='default' />
          <Box fontScale='h4' marginInlineStart='x8' color='default'>
            Log Viewer
          </Box>
        </Box>
        <ButtonGroup>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <Icon name='refresh' size='x16' />
            Refresh
          </Button>
          <Button onClick={handleToggleStreaming} primary={isStreaming}>
            <Icon name={isStreaming ? 'pause' : 'play'} size='x16' />
            {isStreaming ? 'Stop' : 'Stream'}
          </Button>
          <Button onClick={handleCopyLogs}>
            <Icon name='copy' size='x16' />
            Copy
          </Button>
          <Button onClick={handleClearLogs} danger>
            <Icon name='trash' size='x16' />
            Clear
          </Button>
          <Button onClick={handleClose}>
            <Icon name='cross' size='x16' />
            Close
          </Button>
        </ButtonGroup>
      </Box>

      <Box
        padding='x24'
        paddingBlockStart='x12'
        paddingBlockEnd='x12'
        display='flex'
        flexDirection='row'
        flexWrap='wrap'
        alignItems='center'
        borderBlockEnd='1px solid var(--rcx-color-stroke-light)'
        backgroundColor='surface-tint'
      >
        <Box flexGrow={1} minWidth='x200' marginInlineEnd='x12'>
          <SearchInput
            placeholder='Search logs...'
            value={searchFilter}
            onChange={handleSearchFilterChange}
          />
        </Box>
        <Box minWidth='x120' marginInlineEnd='x12'>
          <SelectLegacy
            placeholder='Level'
            value={levelFilter}
            options={levelFilterOptions}
            onChange={handleLevelFilterChange}
          />
        </Box>
        <Box minWidth='x120' marginInlineEnd='x12'>
          <SelectLegacy
            placeholder='Context'
            value={contextFilter}
            options={contextFilterOptions}
            onChange={handleContextFilterChange}
          />
        </Box>
        <Button onClick={handleClearAll} small>
          Clear Filters
        </Button>
      </Box>

      <Box flexGrow={1} padding='x24' paddingBlockStart='x12'>
        <Tile elevation='2' padding={0} overflow='hidden' height='100%'>
          {isLoading ? (
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
              height='x400'
              backgroundColor='surface-light'
            >
              <Throbber size='x32' />
            </Box>
          ) : (
            <Scrollable>
              <Box ref={scrollRef} padding='x0'>
                {paginatedLogs.length === 0 ? (
                  <Box
                    display='flex'
                    flexDirection='column'
                    justifyContent='center'
                    alignItems='center'
                    height='x200'
                    color='hint'
                    backgroundColor='surface-light'
                  >
                    <Icon name='list-alt' size='x32' color='hint' />
                    <Box marginBlockStart='x8' fontScale='p2'>
                      No logs found
                    </Box>
                    <Box marginBlockStart='x4' fontScale='c1' color='hint'>
                      Try adjusting your filters or refresh the logs
                    </Box>
                  </Box>
                ) : (
                  paginatedLogs.map((entry) => (
                    <LogEntry key={entry.id} entry={entry} />
                  ))
                )}
              </Box>
            </Scrollable>
          )}
        </Tile>
      </Box>

      {filteredLogs.length > itemsPerPage && (
        <Box padding='x24' paddingBlockStart='x0'>
          <Pagination
            current={currentPagination}
            itemsPerPage={itemsPerPage}
            itemsPerPageLabel={() => 'Items per page'}
            showingResultsLabel={showingResultsLabel}
            count={filteredLogs.length}
            onSetItemsPerPage={setItemsPerPage}
            onSetCurrent={setCurrentPagination}
          />
        </Box>
      )}
    </Box>
  );
}

export default LogViewerWindow;
