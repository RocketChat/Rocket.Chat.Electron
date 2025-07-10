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
  Chip,
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

const getLevelColor = (level: LogLevel): string => {
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
      return 'neutral';
    default:
      return 'neutral';
  }
};

const LogEntry = ({ entry }: { entry: LogEntryType }) => {
  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='flex-start'
      padding={8}
      borderBlockEnd='1px solid'
      borderColor='neutral-300'
      fontFamily='mono'
      fontSize='x12'
      lineHeight='x16'
    >
      <Box minWidth={140} marginInlineEnd={8} color='hint' fontWeight='normal'>
        {entry.timestamp}
      </Box>
      <Box marginInlineEnd={8}>
        <Chip size='small' color={getLevelColor(entry.level)}>
          {entry.level.toUpperCase()}
        </Chip>
      </Box>
      {entry.context && (
        <Box marginInlineEnd={8} color='info' fontWeight='bold' minWidth={80}>
          [{entry.context}]
        </Box>
      )}
      <Box flexGrow={1} wordBreak='break-word'>
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

  // Parse log line into structured format
  const parseLogLine = useCallback(
    (line: string, index: number): LogEntryType => {
      // Match the actual electron-log format: [timestamp] [level] message
      const logRegex = /^\[([^\]]+)\] \[([^\]]+)\]\s*(.*)$/;
      const match = line.match(logRegex);

      if (match) {
        const [, timestamp, level, rest] = match;

        // Check if the message contains context information in brackets
        const contextMatch = rest.match(
          /^(\[[^\]]+\](?:\s*\[[^\]]+\])*)\s*(.*)$/
        );
        const context = contextMatch?.[1] || '';
        const message = contextMatch?.[2] || rest;

        return {
          id: `log-${index}`,
          timestamp,
          level: level.trim() as LogLevel,
          context: context.replace(/[\[\]]/g, ' ').trim(),
          message: message.trim(),
          raw: line,
        };
      }

      // Fallback for unparseable lines
      return {
        id: `log-${index}`,
        timestamp: '',
        level: 'info',
        context: '',
        message: line,
        raw: line,
      };
    },
    []
  );

  // Load logs from file
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await ipcRenderer.invoke('log-viewer-window/read-logs');
      if (response?.success && response.logs) {
        const parsedLogs = response.logs
          .split('\n')
          .filter((line: string) => line.trim())
          .map(parseLogLine)
          .reverse(); // Show newest logs first
        setLogEntries(parsedLogs);
      } else {
        console.error('Failed to load logs:', response?.error);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parseLogLine]);

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
      backgroundColor='light'
    >
      <Box
        minHeight={64}
        padding={24}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
        borderBlockEnd='1px solid'
        borderColor='neutral-300'
      >
        <Box
          display='flex'
          flexDirection='row'
          alignItems='center'
          flexGrow={1}
        >
          <Icon name='list-alt' size='x20' />
          <Box fontScale='h4' marginInlineStart={8}>
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
        padding={24}
        paddingBlockStart={12}
        paddingBlockEnd={12}
        display='flex'
        flexDirection='row'
        flexWrap='wrap'
        alignItems='center'
        borderBlockEnd='1px solid'
        borderColor='neutral-300'
      >
        <Box flexGrow={1} minWidth={200} marginInlineEnd={12}>
          <SearchInput
            placeholder='Search logs...'
            value={searchFilter}
            onChange={handleSearchFilterChange}
          />
        </Box>
        <Box minWidth={120} marginInlineEnd={12}>
          <SelectLegacy
            placeholder='Level'
            value={levelFilter}
            options={levelFilterOptions}
            onChange={handleLevelFilterChange}
          />
        </Box>
        <Box minWidth={120} marginInlineEnd={12}>
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

      <Box flexGrow={1} padding={24} paddingBlockStart={12}>
        <Tile elevation='1' padding={0} overflow='hidden' height='100%'>
          {isLoading ? (
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
              height='400px'
            >
              <Throbber size='x32' />
            </Box>
          ) : (
            <Scrollable>
              <Box ref={scrollRef} padding={16}>
                {paginatedLogs.length === 0 ? (
                  <Box
                    display='flex'
                    justifyContent='center'
                    alignItems='center'
                    height='200px'
                    color='hint'
                  >
                    No logs found
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
        <Box padding={24} paddingBlockStart={0}>
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
