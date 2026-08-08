import {
  Box,
  States,
  StatesAction,
  StatesActions,
  StatesIcon,
  StatesSubtitle,
  StatesTitle,
  Throbber,
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
import { GroupedVirtuoso } from 'react-virtuoso';

import TooltipProvider from '../ui/components/utils/TooltipProvider';
import { DayDivider } from './DayDivider';
import { LogEntry } from './LogEntry';
import { LogStatusBar } from './LogStatusBar';
import { LogViewerSidebar } from './LogViewerSidebar';
import { LogViewerToolbar } from './LogViewerToolbar';
import type { PaletteTheme } from './appearance';
import { LOG_LEVELS, isTransparentWindow, resolveSurfaces } from './appearance';
import {
  AUTO_REFRESH_INTERVAL_MS,
  PAGE_SIZE,
  SCROLL_DELAY_MS,
  SEARCH_DEBOUNCE_MS,
  VIRTUOSO_OVERSCAN,
} from './constants';
import { toggleFacet } from './filters';
import { advanceVisibleCount } from './pagination';
import { countBy, getEntryDay, parseLogLines } from './parseLogs';
import { LogViewerGlobalStyles } from './styles';
import {
  type LogLevel,
  type LogEntryType,
  type ReadLogsResponse,
  type ReadLogsTailResponse,
  type SaveLogsResponse,
  type SelectFileResponse,
  type ClearLogsResponse,
} from './types';

/** Context tags that have a friendlier translated name than the raw tag. */
const CONTEXT_LABEL_KEYS: Record<string, string> = {
  'main': 'logViewer.filters.context.main',
  'renderer:root': 'logViewer.filters.context.renderer',
  'renderer:webview': 'logViewer.filters.context.webview',
  'renderer:videocall': 'logViewer.filters.context.videocall',
  'videocall': 'logViewer.filters.context.videocall',
  'outlook': 'logViewer.filters.context.outlook',
  'auth': 'logViewer.filters.context.auth',
  'updates': 'logViewer.filters.context.updates',
  'notifications': 'logViewer.filters.context.notifications',
  'servers': 'logViewer.filters.context.servers',
  'ipc': 'logViewer.filters.context.ipc',
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const formatDayLabel = (day: string): string => {
  const parsed = new Date(day);
  if (isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type LogViewerWindowProps = {
  paletteTheme: PaletteTheme;
};

function LogViewerWindow({ paletteTheme }: LogViewerWindowProps) {
  const { t } = useTranslation();
  const surfaces = useMemo(
    () => resolveSurfaces(paletteTheme, isTransparentWindow),
    [paletteTheme]
  );

  const [searchFilter, setSearchFilter] = useState('');
  const debouncedSearchFilter = useDebouncedValue(
    searchFilter,
    SEARCH_DEBOUNCE_MS
  );
  const [logEntries, setLogEntries] = useState<LogEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const lastModifiedTimeRef = useRef<number | undefined>(undefined);
  const lastKnownSizeRef = useRef<number>(0);
  const isAutoScrollingRef = useRef(false);
  const parseGenerationRef = useRef(0);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [serverMapping, setServerMapping] = useState<Record<string, string>>(
    {}
  );
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    totalEntries: number;
    totalEntriesInFile?: number;
    lastModified: string;
    dateRange: string;
    lastModifiedTime?: number;
  } | null>(null);
  const [currentLogFile, setCurrentLogFile] = useState<{
    filePath?: string;
    fileName: string;
    isDefaultLog: boolean;
  }>({
    fileName: 'main.log',
    isDefaultLog: true,
  });

  const [isSidebarVisible, setIsSidebarVisible] = useLocalStorage(
    'log-viewer/sidebar-visible',
    true
  );
  const [showContext, setShowContext] = useLocalStorage(
    'log-viewer/show-context',
    true
  );
  const [showServer, setShowServer] = useLocalStorage(
    'log-viewer/show-server',
    true
  );
  const [wrapLines, setWrapLines] = useLocalStorage(
    'log-viewer/wrap-lines',
    true
  );
  const [collapseMultiline, setCollapseMultiline] = useLocalStorage(
    'log-viewer/collapse-multiline',
    true
  );
  const [autoScroll, setAutoScroll] = useLocalStorage(
    'log-viewer/auto-scroll',
    true
  );
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // How many matching entries are handed to the list. Scrolling to the end
  // raises it a page at a time, so reading further back is a scroll rather than
  // a filter the reader has to find and change.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [storedLevelFilters, setLevelFilters] = useLocalStorage<LogLevel[]>(
    'log-viewer/levels',
    []
  );
  const [storedContextFilters, setContextFilters] = useLocalStorage<string[]>(
    'log-viewer/contexts',
    []
  );
  const [storedServerFilters, setServerFilters] = useLocalStorage<string[]>(
    'log-viewer/servers',
    []
  );

  // Persisted selections are user-editable JSON, so never trust their shape.
  const levelFilters = useMemo(
    () => (Array.isArray(storedLevelFilters) ? storedLevelFilters : []),
    [storedLevelFilters]
  );
  const contextFilters = useMemo(
    () => (Array.isArray(storedContextFilters) ? storedContextFilters : []),
    [storedContextFilters]
  );
  const serverFilters = useMemo(
    () => (Array.isArray(storedServerFilters) ? storedServerFilters : []),
    [storedServerFilters]
  );

  const handleSearchFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchFilter(event.target.value);
    },
    []
  );

  const serverOptions = useMemo(
    () => Object.keys(serverMapping),
    [serverMapping]
  );

  const serverLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    Object.entries(serverMapping).forEach(([hostname, name]) => {
      labels[hostname] = name || hostname;
    });
    return labels;
  }, [serverMapping]);

  // Drop persisted hosts that are no longer configured, so a removed workspace
  // cannot leave the list filtered down to nothing.
  useEffect(() => {
    if (serverOptions.length === 0 || serverFilters.length === 0) return;
    const pruned = serverFilters.filter((host) => serverOptions.includes(host));
    if (pruned.length !== serverFilters.length) {
      setServerFilters(pruned);
    }
  }, [serverFilters, serverOptions, setServerFilters]);

  const handleClearFilters = useCallback((): void => {
    setSearchFilter('');
    setLevelFilters([]);
    setContextFilters([]);
    setServerFilters([]);
  }, [setLevelFilters, setContextFilters, setServerFilters]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/read-logs',
        {
          limit: 'all',
          filePath: currentLogFile.isDefaultLog
            ? undefined
            : currentLogFile.filePath,
        }
      )) as ReadLogsResponse;
      if (response?.success && response.logs !== undefined) {
        parseGenerationRef.current += 1;
        const parsedLogs = parseLogLines(
          response.logs,
          `g${parseGenerationRef.current}`
        );
        setLogEntries(parsedLogs);
        setExpandedEntryIds(new Set());

        setCurrentLogFile({
          filePath: response.filePath,
          fileName: response.fileName || 'main.log',
          isDefaultLog: response.isDefaultLog ?? true,
        });

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
            dateRange = `${oldestDate.toLocaleTimeString()} - ${newestDate.toLocaleTimeString()}`;
          } else {
            dateRange = `${oldestDate.toLocaleString()} - ${newestDate.toLocaleString()}`;
          }
        }

        if (response.fileSize !== undefined) {
          lastKnownSizeRef.current = response.fileSize;
        }

        setFileInfo({
          size: sizeFormatted,
          totalEntries: parsedLogs.length,
          totalEntriesInFile: response.totalEntries,
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
  }, [currentLogFile.filePath, currentLogFile.isDefaultLog, t]);

  const matchesSearch = useCallback(
    (entry: LogEntryType): boolean => {
      if (!debouncedSearchFilter) return true;
      const needle = debouncedSearchFilter.toLowerCase();
      return (
        entry.message.toLowerCase().includes(needle) ||
        entry.context.toLowerCase().includes(needle)
      );
    },
    [debouncedSearchFilter]
  );

  const matchesServer = useCallback(
    (entry: LogEntryType): boolean => {
      if (serverFilters.length === 0) return true;
      return serverFilters.some(
        (host) =>
          entry.contextTags.includes(host) || entry.message.includes(host)
      );
    },
    [serverFilters]
  );

  const matchesLevel = useCallback(
    (entry: LogEntryType): boolean =>
      levelFilters.length === 0 || levelFilters.includes(entry.level),
    [levelFilters]
  );

  const matchesContext = useCallback(
    (entry: LogEntryType): boolean =>
      contextFilters.length === 0 ||
      entry.contextTags.some((tag) => contextFilters.includes(tag)),
    [contextFilters]
  );

  /**
   * Counts are faceted: each list reports what selecting it would yield with the
   * *other* filters applied, so a count is never a number the reader cannot get.
   */
  const searchedEntries = useMemo(
    () => logEntries.filter(matchesSearch),
    [logEntries, matchesSearch]
  );

  const levelCounts = useMemo(
    () =>
      countBy(
        searchedEntries.filter(
          (entry) => matchesContext(entry) && matchesServer(entry)
        ),
        (entry) => [entry.level]
      ),
    [searchedEntries, matchesContext, matchesServer]
  );

  const contextCounts = useMemo(
    () =>
      countBy(
        searchedEntries.filter(
          (entry) => matchesLevel(entry) && matchesServer(entry)
        ),
        (entry) => entry.contextTags.filter((tag) => !(tag in serverMapping))
      ),
    [searchedEntries, matchesLevel, matchesServer, serverMapping]
  );

  const serverCounts = useMemo(
    () =>
      countBy(
        searchedEntries.filter(
          (entry) => matchesLevel(entry) && matchesContext(entry)
        ),
        (entry) =>
          serverOptions.filter(
            (host) =>
              entry.contextTags.includes(host) || entry.message.includes(host)
          )
      ),
    [searchedEntries, matchesLevel, matchesContext, serverOptions]
  );

  /** Levels and context tags that actually occur in the loaded file. */
  const availableLevels = useMemo(() => {
    const present = new Set(logEntries.map((entry) => entry.level));
    return LOG_LEVELS.filter((level) => present.has(level));
  }, [logEntries]);

  const contextOptions = useMemo(() => {
    const totals = countBy(logEntries, (entry) =>
      entry.contextTags.filter((tag) => !(tag in serverMapping))
    );
    return Object.keys(totals).sort(
      (a, b) => totals[b] - totals[a] || a.localeCompare(b)
    );
  }, [logEntries, serverMapping]);

  const contextLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    contextOptions.forEach((tag) => {
      const key = CONTEXT_LABEL_KEYS[tag];
      labels[tag] = key ? t(key) : tag;
    });
    return labels;
  }, [contextOptions, t]);

  /** Every entry matching the filters — what Copy and Save act on. */
  const filteredLogs = useMemo(
    () =>
      searchedEntries.filter(
        (entry) =>
          matchesLevel(entry) && matchesContext(entry) && matchesServer(entry)
      ),
    [searchedEntries, matchesLevel, matchesContext, matchesServer]
  );

  /** The page of matches currently handed to the list. */
  const visibleLogs = useMemo(
    () => filteredLogs.slice(0, visibleCount),
    [filteredLogs, visibleCount]
  );

  const handleEndReached = useCallback(() => {
    setVisibleCount((previous) =>
      advanceVisibleCount(previous, filteredLogs.length, PAGE_SIZE)
    );
  }, [filteredLogs.length]);

  // Changing what matches restarts paging; appended entries must not, or a
  // reader scrolled into history would be yanked back to the first page.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearchFilter, levelFilters, contextFilters, serverFilters]);

  /**
   * Runs of entries sharing a calendar day. Fed to the list as groups so their
   * headers stick to the top of the viewport while that day scrolls past.
   */
  const dayGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    let previousDay: string | undefined;
    visibleLogs.forEach((entry) => {
      const day = getEntryDay(entry.timestamp);
      if (day !== previousDay) {
        groups.push({ label: formatDayLabel(day), count: 0 });
        previousDay = day;
      }
      groups[groups.length - 1].count += 1;
    });
    return groups;
  }, [visibleLogs]);

  const dayGroupCounts = useMemo(
    () => dayGroups.map((group) => group.count),
    [dayGroups]
  );

  const activeFilterCount = useMemo(
    () =>
      (debouncedSearchFilter ? 1 : 0) +
      (levelFilters.length > 0 ? 1 : 0) +
      (contextFilters.length > 0 ? 1 : 0) +
      (serverFilters.length > 0 ? 1 : 0),
    [debouncedSearchFilter, levelFilters, contextFilters, serverFilters]
  );

  const handleToggleLevel = useCallback(
    (level: LogLevel) => {
      setLevelFilters((previous) =>
        toggleFacet(
          Array.isArray(previous) ? previous : [],
          level,
          availableLevels.length > 0 ? availableLevels : LOG_LEVELS
        )
      );
    },
    [availableLevels, setLevelFilters]
  );

  const handleToggleContext = useCallback(
    (context: string) => {
      setContextFilters((previous) =>
        toggleFacet(
          Array.isArray(previous) ? previous : [],
          context,
          contextOptions
        )
      );
    },
    [contextOptions, setContextFilters]
  );

  const handleToggleServer = useCallback(
    (server: string) => {
      setServerFilters((previous) =>
        toggleFacet(
          Array.isArray(previous) ? previous : [],
          server,
          serverOptions
        )
      );
    },
    [serverOptions, setServerFilters]
  );

  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedEntryIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    lastModifiedTimeRef.current = fileInfo?.lastModifiedTime;
  }, [fileInfo?.lastModifiedTime]);

  // Fetch server-N → workspace name mapping from the main process
  useEffect(() => {
    const fetchMapping = async () => {
      try {
        const response = (await ipcRenderer.invoke(
          'log-viewer-window/get-server-mapping'
        )) as { success: boolean; mapping: Record<string, string> };
        if (response?.success) {
          setServerMapping(response.mapping);
        }
      } catch {
        // Non-critical: mapping not available yet
      }
    };
    fetchMapping();
    const interval = setInterval(fetchMapping, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs, currentLogFile.filePath, currentLogFile.isDefaultLog]);

  const checkForUpdates = useCallback(async () => {
    if (!isStreaming || !currentLogFile.isDefaultLog) return;

    try {
      const statResponse = (await ipcRenderer.invoke(
        'log-viewer-window/stat-log',
        { filePath: undefined }
      )) as { success: boolean; lastModifiedTime?: number; size?: number };

      if (!statResponse?.success || !statResponse.lastModifiedTime) return;

      const currentModTime = lastModifiedTimeRef.current;
      if (!currentModTime || statResponse.lastModifiedTime <= currentModTime)
        return;

      const currentSize = statResponse.size ?? 0;
      const previousSize = lastKnownSizeRef.current;

      // File was truncated/rotated (or cleared) — full re-read
      if (currentSize < previousSize) {
        loadLogs();
        return;
      }

      // No new bytes — just a timestamp change (e.g. chmod)
      if (currentSize === previousSize) {
        lastModifiedTimeRef.current = statResponse.lastModifiedTime;
        return;
      }

      // Incremental read: only fetch new bytes appended since last read
      const tailResponse = (await ipcRenderer.invoke(
        'log-viewer-window/read-logs-tail',
        { fromByte: previousSize }
      )) as ReadLogsTailResponse;

      if (tailResponse?.success && tailResponse.logs) {
        parseGenerationRef.current += 1;
        const newEntries = parseLogLines(
          tailResponse.logs,
          `g${parseGenerationRef.current}`
        );
        if (newEntries.length > 0) {
          setLogEntries((prev) => {
            // newEntries are already reversed (newest first)
            // Prepend them to existing entries
            return [...newEntries, ...prev];
          });

          setFileInfo((prev) =>
            prev
              ? {
                  ...prev,
                  totalEntries: prev.totalEntries + newEntries.length,
                  totalEntriesInFile:
                    (prev.totalEntriesInFile ?? 0) + newEntries.length,
                  lastModified: new Date().toLocaleString(),
                  lastModifiedTime: tailResponse.lastModifiedTime,
                }
              : prev
          );
        }

        if (tailResponse.newSize !== undefined) {
          lastKnownSizeRef.current = tailResponse.newSize;
        }
        lastModifiedTimeRef.current = tailResponse.lastModifiedTime;
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, [isStreaming, currentLogFile.isDefaultLog, loadLogs]);

  useEffect(() => {
    if (!isStreaming || !currentLogFile.isDefaultLog) return;

    const interval = setInterval(checkForUpdates, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isStreaming, currentLogFile.isDefaultLog, checkForUpdates]);

  useEffect(() => {
    if (autoScroll) {
      setUserHasScrolled(false);
    }
  }, [autoScroll]);

  useEffect(() => {
    if (
      autoScroll &&
      !userHasScrolled &&
      logEntries.length > 0 &&
      virtuosoRef.current
    ) {
      const timeoutId = setTimeout(() => {
        isAutoScrollingRef.current = true;
        if (virtuosoRef.current && autoScroll && !userHasScrolled) {
          virtuosoRef.current.scrollToIndex({
            index: 0,
            behavior: 'auto',
          });
        }
        isAutoScrollingRef.current = false;
      }, SCROLL_DELAY_MS);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [logEntries, autoScroll, userHasScrolled]);

  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;
    if (autoScroll && !userHasScrolled) {
      setUserHasScrolled(true);
    }
  }, [autoScroll, userHasScrolled]);

  const handleCopyEntry = useCallback((entry: LogEntryType) => {
    navigator.clipboard.writeText(entry.raw).catch((error) => {
      console.error('Failed to copy entry to clipboard:', error);
    });
  }, []);

  const renderDayGroup = useCallback(
    (groupIndex: number) => (
      <DayDivider
        label={dayGroups[groupIndex]?.label ?? ''}
        surfaces={surfaces}
      />
    ),
    [dayGroups, surfaces]
  );

  const renderLogEntry = useCallback(
    (_index: number, _groupIndex: number, entry: LogEntryType) => (
      <LogEntry
        entry={entry}
        showContext={showContext}
        showServer={showServer}
        serverMapping={serverMapping}
        searchTerm={debouncedSearchFilter}
        wrapLines={wrapLines}
        collapseEnabled={collapseMultiline}
        isExpanded={expandedEntryIds.has(entry.id)}
        onToggleExpanded={handleToggleExpanded}
        onCopy={handleCopyEntry}
        surfaces={surfaces}
      />
    ),
    [
      showContext,
      showServer,
      serverMapping,
      debouncedSearchFilter,
      wrapLines,
      collapseMultiline,
      expandedEntryIds,
      handleToggleExpanded,
      handleCopyEntry,
      surfaces,
    ]
  );

  const handleOpenLogFile = useCallback(async () => {
    try {
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/select-log-file'
      )) as SelectFileResponse;
      if (response?.success && response.filePath) {
        setLogEntries([]);
        setFileInfo(null);

        setIsStreaming(false);

        setCurrentLogFile({
          filePath: response.filePath,
          fileName: response.fileName || 'custom.log',
          isDefaultLog: false,
        });
      }
    } catch (error) {
      console.error('Failed to open log file:', error);
    }
  }, []);

  const handleOpenDefaultLog = useCallback(() => {
    setLogEntries([]);
    setFileInfo(null);

    setCurrentLogFile({
      filePath: undefined,
      fileName: 'main.log',
      isDefaultLog: true,
    });
  }, []);

  const handleRefresh = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearLogs = useCallback(async () => {
    if (!currentLogFile.isDefaultLog) {
      return;
    }
    try {
      const confirmed = await ipcRenderer.invoke(
        'log-viewer-window/confirm-clear-logs'
      );
      if (!confirmed) return;

      const response = (await ipcRenderer.invoke(
        'log-viewer-window/clear-logs'
      )) as ClearLogsResponse;
      if (response?.success) {
        lastKnownSizeRef.current = 0;
        loadLogs();
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }, [currentLogFile.isDefaultLog, loadLogs]);

  const handleToggleStreaming = useCallback(() => {
    setIsStreaming((previous) => !previous);
  }, []);

  const handleCopyLogs = useCallback(() => {
    const logText = filteredLogs.map((entry) => entry.raw).join('\n');
    navigator.clipboard.writeText(logText).catch((error) => {
      console.error('Failed to copy logs to clipboard:', error);
    });
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
        console.log('Logs saved successfully to:', response.filePath);
      } else if (response?.error) {
        console.error('Failed to save logs:', response.error);
      }
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }, [filteredLogs]);

  const handleToggleAutoScroll = useCallback(() => {
    setAutoScroll((previous) => {
      const next = !previous;
      if (next) {
        setUserHasScrolled(false);
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: 0, behavior: 'smooth' });
        }, SCROLL_DELAY_MS);
      }
      return next;
    });
  }, [setAutoScroll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSidebarVisible(true);
        const searchInput = document.querySelector(
          'input[type="search"]'
        ) as HTMLInputElement;
        searchInput?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveLogs();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarVisible((previous) => !previous);
      }
      if (e.key === 'Escape' && searchFilter) {
        setSearchFilter('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchFilter, handleSaveLogs, setIsSidebarVisible]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarVisible((previous) => !previous);
  }, [setIsSidebarVisible]);

  return (
    <TooltipProvider>
      <LogViewerGlobalStyles
        isTransparent={isTransparentWindow}
        paletteTheme={paletteTheme}
        surfaces={surfaces}
      />
      <Box
        display='flex'
        flexDirection='column'
        height='100vh'
        width='100%'
        style={{
          backgroundColor: isTransparentWindow
            ? 'transparent'
            : 'var(--rcx-color-surface-light)',
        }}
      >
        <LogViewerToolbar
          surfaces={surfaces}
          fileName={currentLogFile.fileName}
          filePath={currentLogFile.filePath}
          isDefaultLog={currentLogFile.isDefaultLog}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={handleToggleSidebar}
          isLoading={isLoading}
          isStreaming={isStreaming}
          onOpenLogFile={handleOpenLogFile}
          onOpenDefaultLog={handleOpenDefaultLog}
          onRefresh={handleRefresh}
          onToggleStreaming={handleToggleStreaming}
          onCopy={handleCopyLogs}
          onSave={handleSaveLogs}
          onClear={handleClearLogs}
        />

        <Box
          display='flex'
          flexDirection='row'
          flexGrow={1}
          style={{ minHeight: 0 }}
        >
          {isSidebarVisible && (
            <LogViewerSidebar
              surfaces={surfaces}
              searchFilter={searchFilter}
              onSearchFilterChange={handleSearchFilterChange}
              levelFilters={levelFilters}
              availableLevels={availableLevels}
              levelCounts={levelCounts}
              onToggleLevel={handleToggleLevel}
              contextOptions={contextOptions}
              contextLabels={contextLabels}
              contextFilters={contextFilters}
              contextCounts={contextCounts}
              onToggleContext={handleToggleContext}
              serverOptions={serverOptions}
              serverLabels={serverLabels}
              serverFilters={serverFilters}
              serverCounts={serverCounts}
              onToggleServer={handleToggleServer}
              showContext={showContext}
              onToggleShowContext={() => setShowContext(!showContext)}
              showServer={showServer}
              onToggleShowServer={() => setShowServer(!showServer)}
              wrapLines={wrapLines}
              onToggleWrapLines={() => setWrapLines(!wrapLines)}
              collapseMultiline={collapseMultiline}
              onToggleCollapseMultiline={() =>
                setCollapseMultiline(!collapseMultiline)
              }
              autoScroll={autoScroll}
              onToggleAutoScroll={handleToggleAutoScroll}
              activeFilterCount={activeFilterCount}
              onClearFilters={handleClearFilters}
            />
          )}

          <Box
            flexGrow={1}
            display='flex'
            flexDirection='column'
            style={{ minWidth: 0, backgroundColor: surfaces.list }}
          >
            {isLoading && logEntries.length === 0 && (
              <Box
                display='flex'
                justifyContent='center'
                alignItems='center'
                flexGrow={1}
              >
                <Throbber size='x32' />
              </Box>
            )}
            {!isLoading && visibleLogs.length === 0 && (
              <Box
                display='flex'
                justifyContent='center'
                alignItems='center'
                flexGrow={1}
              >
                <States>
                  <StatesIcon name='magnifier' />
                  <StatesTitle>
                    {t('logViewer.messages.noLogsFound')}
                  </StatesTitle>
                  <StatesSubtitle>
                    {t('logViewer.messages.adjustFilters')}
                  </StatesSubtitle>
                  {activeFilterCount > 0 && (
                    <StatesActions>
                      <StatesAction onClick={handleClearFilters}>
                        {t('logViewer.buttons.clearFilters')}
                      </StatesAction>
                    </StatesActions>
                  )}
                </States>
              </Box>
            )}
            {visibleLogs.length > 0 && (
              <GroupedVirtuoso
                ref={virtuosoRef}
                data={visibleLogs}
                groupCounts={dayGroupCounts}
                groupContent={renderDayGroup}
                // Group header rows share the flat index space with entries but
                // have no data item, so `entry` is undefined for them.
                computeItemKey={(index, entry) => entry?.id ?? `day-${index}`}
                itemContent={renderLogEntry}
                overscan={VIRTUOSO_OVERSCAN}
                style={{ height: '100%', width: '100%' }}
                onScroll={handleScroll}
                endReached={handleEndReached}
              />
            )}
          </Box>
        </Box>

        <LogStatusBar
          surfaces={surfaces}
          shownCount={filteredLogs.length}
          loadedCount={logEntries.length}
          fileSize={fileInfo?.size}
          dateRange={fileInfo?.dateRange}
          filePath={currentLogFile.filePath}
          isStreaming={isStreaming}
          isLoading={isLoading}
        />
      </Box>
    </TooltipProvider>
  );
}

export default LogViewerWindow;
