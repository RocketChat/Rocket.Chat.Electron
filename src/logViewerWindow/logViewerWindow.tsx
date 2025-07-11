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
  Chip,
  CheckBox,
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const LogEntry = ({
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

function LogViewerWindow() {
  const { t } = useTranslation();

  const [searchFilter, setSearchFilter] = useLocalStorage('log-search', '');
  const [logEntries, setLogEntries] = useState<LogEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    totalEntries: number;
    lastModified: string;
    dateRange: string;
  } | null>(null);
  const [currentLogFile, setCurrentLogFile] = useState<{
    filePath?: string;
    fileName: string;
    isDefaultLog: boolean;
  }>({
    fileName: 'main.log',
    isDefaultLog: true,
  });

  const entryLimitOptions = useMemo<[string, string][]>(
    () => [
      ['100', 'Last 100 entries'],
      ['500', 'Last 500 entries'],
      ['1000', 'Last 1000 entries'],
      ['5000', 'Last 5000 entries'],
      ['all', 'All entries'],
    ],
    []
  );

  const [entryLimit, setEntryLimit] =
    useState<(typeof entryLimitOptions)[number][0]>('100');

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

  const handleEntryLimitChange = useCallback(
    (value: string) => {
      setEntryLimit(value);
    },
    [setEntryLimit]
  );

  const handleClearAll = useCallback((): void => {
    setSearchFilter('');
    setLevelFilter('all');
    setContextFilter('all');
    setEntryLimit('100');
  }, [setSearchFilter, setLevelFilter, setContextFilter, setEntryLimit]);

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
      const response = await ipcRenderer.invoke('log-viewer-window/read-logs', {
        limit: entryLimit === 'all' ? 'all' : parseInt(entryLimit),
        filePath: currentLogFile.filePath,
      });
      if (response?.success && response.logs) {
        const parsedLogs = parseLogLines(response.logs);
        setLogEntries(parsedLogs);

        // Update current file info
        setCurrentLogFile({
          filePath: response.filePath,
          fileName: response.fileName || 'main.log',
          isDefaultLog: response.isDefaultLog ?? true,
        });

        // Calculate file info
        const logText = response.logs;
        const sizeInBytes = new Blob([logText]).size;
        const sizeFormatted = formatFileSize(sizeInBytes);

        const timestamps = parsedLogs
          .map((entry) => new Date(entry.timestamp))
          .filter((date) => !isNaN(date.getTime()));
        const oldestDate =
          timestamps.length > 0
            ? new Date(Math.min(...timestamps.map((d) => d.getTime())))
            : null;
        const newestDate =
          timestamps.length > 0
            ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
            : null;

        let dateRange = 'No entries';
        if (oldestDate && newestDate) {
          if (oldestDate.toDateString() === newestDate.toDateString()) {
            // Same day - show time range
            dateRange = `${oldestDate.toLocaleTimeString('en-GB')} - ${newestDate.toLocaleTimeString('en-GB')}`;
          } else {
            // Multiple days - show date and time range
            dateRange = `${oldestDate.toLocaleDateString()} ${oldestDate.toLocaleTimeString('en-GB')} - ${newestDate.toLocaleDateString()} ${newestDate.toLocaleTimeString('en-GB')}`;
          }
        }

        setFileInfo({
          size: sizeFormatted,
          totalEntries: parsedLogs.length,
          lastModified: new Date().toLocaleString(),
          dateRange,
        });
      } else {
        console.error('Failed to load logs:', response?.error);
        setFileInfo(null);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      setFileInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [parseLogLines, entryLimit, currentLogFile.filePath]);

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
  // Load logs on component mount and when file or limit changes
  useEffect(() => {
    loadLogs();
  }, [
    loadLogs,
    currentLogFile.filePath,
    currentLogFile.isDefaultLog,
    entryLimit,
  ]);

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

  const handleOpenLogFile = useCallback(async () => {
    try {
      const response = await ipcRenderer.invoke(
        'log-viewer-window/select-log-file'
      );
      if (response?.success && response.filePath) {
        // Clear current entries immediately to show loading state
        setLogEntries([]);
        setFileInfo(null);

        setCurrentLogFile({
          filePath: response.filePath,
          fileName: response.fileName,
          isDefaultLog: false,
        });
        // loadLogs will be triggered by the useEffect watching currentLogFile
      }
    } catch (error) {
      console.error('Failed to open log file:', error);
    }
  }, []);

  const handleOpenDefaultLog = useCallback(() => {
    // Clear current entries immediately to show loading state
    setLogEntries([]);
    setFileInfo(null);

    setCurrentLogFile({
      fileName: 'main.log',
      isDefaultLog: true,
    });
    // loadLogs will be triggered by the useEffect watching currentLogFile
  }, []);

  const handleRefresh = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearLogs = useCallback(async () => {
    if (!currentLogFile.isDefaultLog) {
      // Don't allow clearing custom log files
      return;
    }
    try {
      const response = await ipcRenderer.invoke('log-viewer-window/clear-logs');
      if (response?.success) {
        setLogEntries([]);
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }, [currentLogFile.isDefaultLog]);

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
          <Box
            display='flex'
            alignItems='center'
            color='hint'
            fontSize='x12'
            marginInlineStart='x16'
            flexWrap='wrap'
          >
            <Box marginInlineEnd='x8' display='flex' alignItems='center'>
              <Icon
                name={currentLogFile.isDefaultLog ? 'home' : 'attachment'}
                size='x12'
              />
              <Box
                marginInlineStart='x4'
                fontWeight='bold'
                color={currentLogFile.isDefaultLog ? 'default' : 'info'}
              >
                {currentLogFile.fileName}
                {!currentLogFile.isDefaultLog && ' (Custom)'}
              </Box>
            </Box>
            {fileInfo && (
              <>
                <Box marginInlineEnd='x8' display='flex' alignItems='center'>
                  <Icon name='hash' size='x12' />
                  <Box marginInlineStart='x4'>
                    {fileInfo.totalEntries.toLocaleString()} entries
                  </Box>
                </Box>
                <Box marginInlineEnd='x8' display='flex' alignItems='center'>
                  <Icon name='clock' size='x12' />
                  <Box marginInlineStart='x4'>{fileInfo.dateRange}</Box>
                </Box>
              </>
            )}
          </Box>
        </Box>
        <ButtonGroup>
          <Button onClick={handleOpenLogFile}>
            <Icon name='folder' size='x16' />
            Open Log File
          </Button>
          {!currentLogFile.isDefaultLog && (
            <Button onClick={handleOpenDefaultLog}>
              <Icon name='home' size='x16' />
              Default Log
            </Button>
          )}
          <Button onClick={handleRefresh} disabled={isLoading}>
            <Icon name='refresh' size='x16' />
            Refresh
          </Button>
          <Button
            onClick={handleToggleStreaming}
            primary={isStreaming}
            disabled={!currentLogFile.isDefaultLog}
          >
            <Icon name={isStreaming ? 'pause' : 'play'} size='x16' />
            {isStreaming ? 'Stop Auto Refresh' : 'Auto Refresh'}
          </Button>
          <Button onClick={handleCopyLogs}>
            <Icon name='copy' size='x16' />
            Copy
          </Button>
          <Button
            onClick={handleClearLogs}
            danger
            disabled={!currentLogFile.isDefaultLog}
          >
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
        justifyContent='space-between'
        borderBlockEnd='1px solid var(--rcx-color-stroke-light)'
        backgroundColor='surface-tint'
      >
        <Box display='flex' alignItems='center'>
          <CheckBox
            checked={showContext}
            onChange={() => setShowContext(!showContext)}
          />
          <Box marginInlineStart='x4' display='inline'>
            Show Context
          </Box>
        </Box>
        <Box display='flex' alignItems='center' flexWrap='wrap'>
          <Box minWidth='x160' marginInlineEnd='x12'>
            <SelectLegacy
              placeholder='Load amount'
              value={entryLimit}
              options={entryLimitOptions}
              onChange={handleEntryLimitChange}
            />
          </Box>
          <Box minWidth='x200' marginInlineEnd='x12'>
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
                    <LogEntry
                      key={entry.id}
                      entry={entry}
                      showContext={showContext}
                    />
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
