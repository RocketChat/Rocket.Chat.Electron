import {
  Box,
  SearchInput,
  Icon,
  Button,
  ButtonGroup,
  SelectLegacy,
  Tile,
  Throbber,
  CheckBox,
} from '@rocket.chat/fuselage';
import {
  useLocalStorage,
  useDebouncedValue,
} from '@rocket.chat/fuselage-hooks';
import { ipcRenderer } from 'electron';
import type { ChangeEvent } from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { VirtuosoHandle } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';

import { LogEntry } from './LogEntry';
import {
  AUTO_REFRESH_INTERVAL_MS,
  SCROLL_DELAY_MS,
  SEARCH_DEBOUNCE_MS,
  VIRTUOSO_OVERSCAN,
} from './constants';
import {
  type LogLevel,
  type LogEntryType,
  type ReadLogsResponse,
  type SaveLogsResponse,
  type SelectFileResponse,
  type ClearLogsResponse,
  parseLogLevel,
} from './types';

const LOG_LINE_REGEX = /^\[([^\]]+)\] \[([^\]]+)\]\s*(.*)$/;
const CONTEXT_REGEX = /^(\[[^\]]+\](?:\s*\[[^\]]+\])*)\s*(.*)$/;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

function LogViewerWindow() {
  const { t } = useTranslation();
  const [searchFilter, setSearchFilter] = useLocalStorage('log-search', '');
  const debouncedSearchFilter = useDebouncedValue(
    searchFilter,
    SEARCH_DEBOUNCE_MS
  );
  const [logEntries, setLogEntries] = useState<LogEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const lastModifiedTimeRef = useRef<number | undefined>(undefined);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    totalEntries: number;
    lastModified: string;
    dateRange: string;
    lastModifiedTime?: number; // Track actual file modification time for smart refresh
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
      ['100', t('logViewer.filters.entryLimit.last100')],
      ['500', t('logViewer.filters.entryLimit.last500')],
      ['1000', t('logViewer.filters.entryLimit.last1000')],
      ['5000', t('logViewer.filters.entryLimit.last5000')],
      ['all', t('logViewer.filters.entryLimit.all')],
    ],
    [t]
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
      ['all', t('logViewer.filters.level.all')],
      ['debug', t('logViewer.filters.level.debug')],
      ['info', t('logViewer.filters.level.info')],
      ['warn', t('logViewer.filters.level.warn')],
      ['error', t('logViewer.filters.level.error')],
      ['verbose', t('logViewer.filters.level.verbose')],
    ],
    [t]
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
      ['all', t('logViewer.filters.context.all')],
      ['main', t('logViewer.filters.context.main')],
      ['renderer', t('logViewer.filters.context.renderer')],
      ['webview', t('logViewer.filters.context.webview')],
      ['videocall', t('logViewer.filters.context.videocall')],
      ['outlook', '📅 Outlook Calendar'],
    ],
    [t]
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

  /**
   * Parses raw log text into structured log entries
   * Groups multi-line entries (like stack traces) together
   * @param logText - Raw log file content
   * @returns Array of parsed log entries in reverse chronological order (newest first)
   */
  const parseLogLines = useCallback((logText: string): LogEntryType[] => {
    if (!logText || logText.trim() === '') {
      return [];
    }
    const lines = logText.split('\n').filter((line: string) => line.trim());
    const entries: LogEntryType[] = [];
    let currentEntry: LogEntryType | null = null;

    lines.forEach((line, _index) => {
      const match = line.match(LOG_LINE_REGEX);

      if (match) {
        // This is a new log entry
        const [, timestamp, level, rest] = match;

        // Check if the message contains context information in brackets
        const contextMatch = rest.match(CONTEXT_REGEX);
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
          level: parseLogLevel(level),
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

    // Return in reverse chronological order (newest first, oldest last)
    return entries.reverse();
  }, []);

  // Load logs from file
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/read-logs',
        {
          limit: entryLimit === 'all' ? 'all' : parseInt(entryLimit),
          filePath: currentLogFile.isDefaultLog
            ? undefined
            : currentLogFile.filePath,
        }
      )) as ReadLogsResponse;
      if (response?.success && response.logs !== undefined) {
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

        let dateRange = t('logViewer.fileInfo.noEntries');
        if (oldestDate && newestDate) {
          if (oldestDate.toDateString() === newestDate.toDateString()) {
            // Same day - show time range
            dateRange = `${oldestDate.toLocaleTimeString()} - ${newestDate.toLocaleTimeString()}`;
          } else {
            // Multiple days - show date and time range
            dateRange = `${oldestDate.toLocaleString()} - ${newestDate.toLocaleString()}`;
          }
        }

        setFileInfo({
          size: sizeFormatted,
          totalEntries: parsedLogs.length,
          lastModified: new Date().toLocaleString(),
          dateRange,
          lastModifiedTime: response.lastModifiedTime,
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
  }, [
    parseLogLines,
    entryLimit,
    currentLogFile.filePath,
    currentLogFile.isDefaultLog,
    t,
  ]);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logEntries.filter((entry) => {
      const matchesSearch =
        !debouncedSearchFilter ||
        entry.message
          .toLowerCase()
          .includes(debouncedSearchFilter.toLowerCase()) ||
        entry.context
          .toLowerCase()
          .includes(debouncedSearchFilter.toLowerCase());

      const matchesLevel = levelFilter === 'all' || entry.level === levelFilter;

      const matchesContext = (() => {
        if (contextFilter === 'all') return true;
        if (contextFilter === 'outlook') {
          // Match Outlook-related logs
          const message = entry.message.toLowerCase();
          const context = entry.context.toLowerCase();
          return (
            message.includes('outlook') ||
            message.includes('calendar') ||
            message.includes('exchange') ||
            message.includes('ntlm') ||
            message.includes('ewsjs') ||
            message.includes('xhr') ||
            context.includes('outlook') ||
            message.includes('events')
          );
        }
        return entry.context
          .toLowerCase()
          .includes(contextFilter.toLowerCase());
      })();

      return matchesSearch && matchesLevel && matchesContext;
    });
  }, [logEntries, debouncedSearchFilter, levelFilter, contextFilter]);

  useEffect(() => {
    lastModifiedTimeRef.current = fileInfo?.lastModifiedTime;
  }, [fileInfo?.lastModifiedTime]);

  // Load logs on component mount and when file or limit changes
  useEffect(() => {
    loadLogs();
  }, [
    loadLogs,
    currentLogFile.filePath,
    currentLogFile.isDefaultLog,
    entryLimit,
  ]);

  // Smart auto-refresh: only refresh if file has been modified
  const checkForUpdates = useCallback(async () => {
    if (!isStreaming || !currentLogFile.isDefaultLog) return;

    try {
      // Just get file info without loading full content
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/read-logs',
        {
          limit: 1, // Just get minimal content to check modification time
          filePath: undefined, // Always undefined for default log
        }
      )) as ReadLogsResponse;

      if (response?.success && response.lastModifiedTime) {
        const currentModTime = lastModifiedTimeRef.current;
        if (currentModTime && response.lastModifiedTime > currentModTime) {
          // File has been modified, reload logs
          loadLogs();
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, [isStreaming, currentLogFile.isDefaultLog, loadLogs]);

  // Auto-refresh: check for file modifications when streaming is enabled
  useEffect(() => {
    if (!isStreaming || !currentLogFile.isDefaultLog) return;

    const interval = setInterval(checkForUpdates, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isStreaming, currentLogFile.isDefaultLog, checkForUpdates]);

  // Reset user scroll tracking when auto-scroll is re-enabled
  useEffect(() => {
    if (autoScroll) {
      setUserHasScrolled(false);
    }
  }, [autoScroll]);

  // Auto-scroll to top when new logs arrive and auto-scroll is enabled (newest logs are at top)
  useEffect(() => {
    if (
      autoScroll &&
      !userHasScrolled &&
      logEntries.length > 0 &&
      virtuosoRef.current
    ) {
      const timeoutId = setTimeout(() => {
        if (virtuosoRef.current && autoScroll && !userHasScrolled) {
          virtuosoRef.current.scrollToIndex({
            index: 0, // Scroll to top since newest logs are now at index 0
            behavior: 'auto',
          });
        }
      }, SCROLL_DELAY_MS);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [logEntries, autoScroll, userHasScrolled]);

  // Track when user manually scrolls
  const handleScroll = useCallback(() => {
    if (autoScroll && !userHasScrolled) {
      setUserHasScrolled(true);
    }
  }, [autoScroll, userHasScrolled]);

  // Virtual scrolling item renderer
  const renderLogEntry = useCallback(
    (_index: number, entry: LogEntryType) => {
      return (
        <LogEntry key={entry.id} entry={entry} showContext={showContext} />
      );
    },
    [showContext]
  );

  const handleOpenLogFile = useCallback(async () => {
    try {
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/select-log-file'
      )) as SelectFileResponse;
      if (response?.success && response.filePath) {
        // Clear current entries immediately to show loading state
        setLogEntries([]);
        setFileInfo(null);

        // Disable auto refresh when switching to custom log file
        setIsStreaming(false);

        setCurrentLogFile({
          filePath: response.filePath,
          fileName: response.fileName || 'custom.log',
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
      filePath: undefined, // Clear any previous custom log file path
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
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/clear-logs'
      )) as ClearLogsResponse;
      if (response?.success) {
        // Reload logs to properly update UI and file info after clearing
        loadLogs();
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }, [currentLogFile.isDefaultLog, loadLogs]);

  const handleToggleStreaming = useCallback(() => {
    setIsStreaming(!isStreaming);
    // TODO: Implement real-time log streaming
  }, [isStreaming]);

  const handleCopyLogs = useCallback(() => {
    const logText = filteredLogs.map((entry) => entry.raw).join('\n');
    navigator.clipboard.writeText(logText);
  }, [filteredLogs]);

  const handleSaveLogs = useCallback(async () => {
    try {
      const logText = filteredLogs.map((entry) => entry.raw).join('\n');
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-');
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/save-logs',
        {
          content: logText,
          defaultFileName: `rocketchat_${timestamp}.zip`,
        }
      )) as SaveLogsResponse;

      if (response?.success) {
        // Could show a success message here if needed
        console.log('Logs saved successfully to:', response.filePath);
      } else if (response?.error) {
        console.error('Failed to save logs:', response.error);
      }
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }, [filteredLogs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[type="search"]'
        ) as HTMLInputElement;
        searchInput?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveLogs();
      }
      if (e.key === 'Escape' && searchFilter) {
        setSearchFilter('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFilter, setSearchFilter, handleSaveLogs]);

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
          <Icon
            name='list-alt'
            size='x20'
            color='default'
            aria-label={t('logViewer.aria.logIcon')}
          />
          <Box fontScale='h4' marginInlineStart='x8' color='default'>
            {t('logViewer.title')}
          </Box>
          <Box
            display='flex'
            flexDirection='column'
            alignItems='flex-start'
            color='hint'
            fontSize='x12'
            marginInlineStart='x16'
          >
            {/* File name line */}
            <Box display='flex' alignItems='center' marginBlockEnd='x4'>
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
                {!currentLogFile.isDefaultLog &&
                  ` (${t('logViewer.fileInfo.custom')})`}
              </Box>
            </Box>
            {/* File stats line */}
            {fileInfo && (
              <Box display='flex' alignItems='center' flexWrap='wrap'>
                <Box marginInlineEnd='x8' display='flex' alignItems='center'>
                  <Icon name='hash' size='x12' />
                  <Box marginInlineStart='x4'>
                    {t('logViewer.fileInfo.entries', {
                      count: fileInfo.totalEntries,
                    })}
                  </Box>
                </Box>
                <Box marginInlineEnd='x8' display='flex' alignItems='center'>
                  <Icon name='file' size='x12' />
                  <Box marginInlineStart='x4'>{fileInfo.size}</Box>
                </Box>
                <Box marginInlineEnd='x8' display='flex' alignItems='center'>
                  <Icon name='clock' size='x12' />
                  <Box marginInlineStart='x4'>{fileInfo.dateRange}</Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <ButtonGroup>
          <Button onClick={handleOpenLogFile}>
            <Icon name='folder' size='x16' />
            {t('logViewer.buttons.openLogFile')}
          </Button>
          {!currentLogFile.isDefaultLog && (
            <Button onClick={handleOpenDefaultLog}>
              <Icon name='home' size='x16' />
              {t('logViewer.buttons.defaultLog')}
            </Button>
          )}
          <Button onClick={handleRefresh} disabled={isLoading}>
            <Icon
              name='refresh'
              size='x16'
              aria-label={t('logViewer.buttons.refresh')}
            />
            {t('logViewer.buttons.refresh')}
          </Button>
          <Button
            onClick={handleToggleStreaming}
            primary={isStreaming}
            disabled={!currentLogFile.isDefaultLog}
          >
            <Icon name={isStreaming ? 'pause' : 'play'} size='x16' />
            {isStreaming
              ? t('logViewer.buttons.stopAutoRefresh')
              : t('logViewer.buttons.autoRefresh')}
          </Button>
          <Button onClick={handleCopyLogs}>
            <Icon name='copy' size='x16' />
            {t('logViewer.buttons.copy')}
          </Button>
          <Button onClick={handleSaveLogs}>
            <Icon name='download' size='x16' />
            {t('logViewer.buttons.save')}
          </Button>
          <Button
            onClick={handleClearLogs}
            danger
            disabled={!currentLogFile.isDefaultLog}
          >
            <Icon name='trash' size='x16' />
            {t('logViewer.buttons.clear')}
          </Button>
          <Button onClick={handleClose}>
            <Icon name='cross' size='x16' />
            {t('logViewer.buttons.close')}
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
        <Box display='flex' alignItems='center' flexWrap='wrap'>
          <Box display='flex' alignItems='center' marginInlineEnd='x16'>
            <CheckBox
              checked={showContext}
              onChange={() => setShowContext(!showContext)}
            />
            <Box marginInlineStart='x4' display='inline'>
              {t('logViewer.controls.showContext')}
            </Box>
          </Box>
          <Box display='flex' alignItems='center'>
            <CheckBox
              checked={autoScroll}
              onChange={() => {
                const newAutoScroll = !autoScroll;
                setAutoScroll(newAutoScroll);
                if (newAutoScroll) {
                  // When re-enabling auto-scroll, immediately scroll to top if there are logs
                  setUserHasScrolled(false);
                  if (filteredLogs.length > 0 && virtuosoRef.current) {
                    setTimeout(() => {
                      virtuosoRef.current?.scrollToIndex({
                        index: 0,
                        behavior: 'smooth',
                      });
                    }, 100);
                  }
                }
              }}
            />
            <Box marginInlineStart='x4' display='inline'>
              {t('logViewer.controls.autoScrollToTop')}
            </Box>
          </Box>
        </Box>
        <Box display='flex' alignItems='center' flexWrap='wrap'>
          <Box minWidth='x160' marginInlineEnd='x12'>
            <SelectLegacy
              placeholder={t('logViewer.placeholders.loadAmount')}
              value={entryLimit}
              options={entryLimitOptions}
              onChange={handleEntryLimitChange}
            />
          </Box>
          <Box minWidth='x200' marginInlineEnd='x12'>
            <SearchInput
              placeholder={t('logViewer.placeholders.searchLogs')}
              value={searchFilter}
              onChange={handleSearchFilterChange}
            />
          </Box>
          <Box minWidth='x120' marginInlineEnd='x12'>
            <SelectLegacy
              placeholder={t('logViewer.placeholders.level')}
              value={levelFilter}
              options={levelFilterOptions}
              onChange={handleLevelFilterChange}
            />
          </Box>
          <Box minWidth='x120' marginInlineEnd='x12'>
            <SelectLegacy
              placeholder={t('logViewer.placeholders.context')}
              value={contextFilter}
              options={contextFilterOptions}
              onChange={handleContextFilterChange}
            />
          </Box>
          <Button onClick={handleClearAll}>
            {t('logViewer.buttons.clearFilters')}
          </Button>
        </Box>
      </Box>

      <Box flexGrow={1} padding='x24' paddingBlockStart='x12'>
        <Tile elevation='2' padding={0} overflow='hidden' height='100%'>
          {isLoading && (
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
              height='x400'
              backgroundColor='surface-light'
            >
              <Throbber size='x32' />
            </Box>
          )}
          {!isLoading && filteredLogs.length === 0 && (
            <Box
              display='flex'
              flexDirection='column'
              justifyContent='center'
              alignItems='center'
              height='100%'
              color='hint'
              backgroundColor='surface-light'
            >
              <Icon name='list-alt' size='x32' color='hint' />
              <Box marginBlockStart='x8' fontScale='p2'>
                {t('logViewer.messages.noLogsFound')}
              </Box>
              <Box marginBlockStart='x4' fontScale='c1' color='hint'>
                {t('logViewer.messages.adjustFilters')}
              </Box>
            </Box>
          )}
          {!isLoading && filteredLogs.length > 0 && (
            <Box style={{ height: '100%', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  color: 'var(--rcx-color-font-hint)',
                  fontSize: '12px',
                  zIndex: 10,
                  background: 'var(--rcx-color-surface-tint)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                {filteredLogs.length} entries
              </div>
              <Virtuoso
                ref={virtuosoRef}
                data={filteredLogs}
                itemContent={renderLogEntry}
                overscan={VIRTUOSO_OVERSCAN}
                style={{ height: '100%', width: '100%' }}
                onScroll={handleScroll}
              />
            </Box>
          )}
        </Tile>
      </Box>
    </Box>
  );
}

export default LogViewerWindow;
