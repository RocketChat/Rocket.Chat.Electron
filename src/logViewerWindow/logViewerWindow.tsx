import {
  Box,
  Button,
  Callout,
  Icon,
  IconButton,
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
import { formatServerTitle } from '../ui/components/utils/formatServerTitle';
import { DayHeader } from '../ui/windowChrome/DayHeader';
import type { PaletteTheme } from '../ui/windowChrome/appearance';
import { getCardStyle, resolveSurfaces } from '../ui/windowChrome/appearance';
import type { FacetSelection } from '../ui/windowChrome/filters';
import {
  isFacetNarrowed,
  isFacetSelected,
  readFacetSelection,
  toggleFacet,
} from '../ui/windowChrome/filters';
import { WindowChromeGlobalStyles } from '../ui/windowChrome/styles';
import { useCopiedFeedback } from '../ui/windowChrome/useCopiedFeedback';
import { useTransparency } from '../ui/windowChrome/useTransparency';
import { LogEntry } from './LogEntry';
import { LogStatusBar } from './LogStatusBar';
import { LogTimeline } from './LogTimeline';
import { LogViewerSidebar } from './LogViewerSidebar';
import { LogViewerToolbar } from './LogViewerToolbar';
import { LOG_LEVELS } from './appearance';
import {
  TRANSPARENCY_CHANNEL,
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_SCROLL_GUARD_MS,
  PAGE_SIZE,
  SCROLL_DELAY_MS,
  SEARCH_DEBOUNCE_MS,
  VIRTUOSO_OVERSCAN,
} from './constants';
import { advanceVisibleCount } from './pagination';
import { countBy, getEntryDay, parseLogLines } from './parseLogs';
import { LogViewerGlobalStyles } from './styles';
import type { TimeRange } from './timeline';
import { isWithinRange } from './timeline';
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
  const isTransparent = useTransparency(TRANSPARENCY_CHANNEL);
  const surfaces = useMemo(
    () => resolveSurfaces(paletteTheme, isTransparent),
    [paletteTheme, isTransparent]
  );
  const cardStyle = useMemo(
    () => getCardStyle(paletteTheme, surfaces),
    [paletteTheme, surfaces]
  );

  const [searchFilter, setSearchFilter] = useState('');
  const debouncedSearchFilter = useDebouncedValue(
    searchFilter,
    SEARCH_DEBOUNCE_MS
  );
  const [logEntries, setLogEntries] = useState<LogEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasSaved, acknowledgeSave] = useCopiedFeedback(
    t('logViewer.buttons.saved')
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const lastModifiedTimeRef = useRef<number | undefined>(undefined);
  const lastKnownSizeRef = useRef<number>(0);
  const isAutoScrollingRef = useRef(false);
  const lastAutoScrollAtRef = useRef(0);
  const isSuspendedRef = useRef(false);
  const parseGenerationRef = useRef(0);
  const loadRequestIdRef = useRef(0);
  const [pendingNewEntryCount, setPendingNewEntryCount] = useState(0);
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
  const [showTimeline, setShowTimeline] = useLocalStorage(
    'log-viewer/show-timeline',
    true
  );
  // Deliberately not persisted: a time range belongs to the file you are reading
  // now, and restoring one silently would hide entries on the next open.
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // How many matching entries are handed to the list. Scrolling to the end
  // raises it a page at a time, so reading further back is a scroll rather than
  // a filter the reader has to find and change.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [storedLevelFilters, setLevelFilters] = useLocalStorage<
    FacetSelection<LogLevel>
  >('log-viewer/levels', null);
  const [storedContextFilters, setContextFilters] =
    useLocalStorage<FacetSelection>('log-viewer/contexts', null);
  const [storedServerFilters, setServerFilters] =
    useLocalStorage<FacetSelection>('log-viewer/servers', null);

  const levelFilters = useMemo(
    () => readFacetSelection<LogLevel>(storedLevelFilters),
    [storedLevelFilters]
  );
  const contextFilters = useMemo(
    () => readFacetSelection(storedContextFilters),
    [storedContextFilters]
  );
  const serverFilters = useMemo(
    () => readFacetSelection(storedServerFilters),
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
    if (serverOptions.length === 0 || serverFilters === null) return;
    const pruned = serverFilters.filter((host) => serverOptions.includes(host));
    if (pruned.length === serverFilters.length) return;

    // Back to untouched when nothing survives: an empty selection now means
    // "no server selected", which would filter the list down to nothing — the
    // very thing this is here to prevent.
    setServerFilters(pruned.length > 0 ? pruned : null);
  }, [serverFilters, serverOptions, setServerFilters]);

  const handleClearFilters = useCallback((): void => {
    setSearchFilter('');
    setLevelFilters(null);
    setContextFilters(null);
    setServerFilters(null);
    setTimeRange(null);
  }, [setLevelFilters, setContextFilters, setServerFilters]);

  const loadLogs = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setIsLoading(true);
    try {
      setLoadError(null);
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/read-logs',
        {
          limit: 'all',
          filePath: currentLogFile.isDefaultLog
            ? undefined
            : currentLogFile.filePath,
        }
      )) as ReadLogsResponse;
      if (requestId !== loadRequestIdRef.current) return;
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
        setLogEntries([]);
        setFileInfo(null);
        setLoadError(response?.error || t('logViewer.messages.loadFailed'));
      }
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error('Failed to load logs:', error);
      setLogEntries([]);
      setFileInfo(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : t('logViewer.messages.loadFailed')
      );
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentLogFile.filePath, currentLogFile.isDefaultLog, t]);

  const matchesSearch = useCallback(
    (entry: LogEntryType): boolean => {
      if (!debouncedSearchFilter) return true;
      return entry.searchText.includes(debouncedSearchFilter.toLowerCase());
    },
    [debouncedSearchFilter]
  );

  const matchesServer = useCallback(
    (entry: LogEntryType): boolean => {
      if (serverFilters === null) return true;
      return serverFilters.some(
        (host) =>
          entry.contextTags.includes(host) || entry.message.includes(host)
      );
    },
    [serverFilters]
  );

  const matchesLevel = useCallback(
    (entry: LogEntryType): boolean =>
      isFacetSelected(levelFilters, entry.level),
    [levelFilters]
  );

  const matchesContext = useCallback(
    (entry: LogEntryType): boolean =>
      contextFilters === null ||
      entry.contextTags.some((tag) => contextFilters.includes(tag)),
    [contextFilters]
  );

  const matchesTimeRange = useCallback(
    (entry: LogEntryType): boolean =>
      timeRange === null ||
      isWithinRange(new Date(entry.timestamp).getTime(), timeRange),
    [timeRange]
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
          (entry) =>
            matchesContext(entry) &&
            matchesServer(entry) &&
            matchesTimeRange(entry)
        ),
        (entry) => [entry.level]
      ),
    [searchedEntries, matchesContext, matchesServer, matchesTimeRange]
  );

  const contextCounts = useMemo(
    () =>
      countBy(
        searchedEntries.filter(
          (entry) =>
            matchesLevel(entry) &&
            matchesServer(entry) &&
            matchesTimeRange(entry)
        ),
        (entry) => entry.contextTags.filter((tag) => !(tag in serverMapping))
      ),
    [
      searchedEntries,
      matchesLevel,
      matchesServer,
      matchesTimeRange,
      serverMapping,
    ]
  );

  const serverCounts = useMemo(
    () =>
      countBy(
        searchedEntries.filter(
          (entry) =>
            matchesLevel(entry) &&
            matchesContext(entry) &&
            matchesTimeRange(entry)
        ),
        (entry) =>
          serverOptions.filter(
            (host) =>
              entry.contextTags.includes(host) || entry.message.includes(host)
          )
      ),
    [
      searchedEntries,
      matchesLevel,
      matchesContext,
      matchesTimeRange,
      serverOptions,
    ]
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

  /**
   * Matches of every filter except the time range — the chart's data, so it can
   * keep showing the whole span with the selection marked on top of it.
   */
  const timelineEntries = useMemo(
    () =>
      searchedEntries.filter(
        (entry) =>
          matchesLevel(entry) && matchesContext(entry) && matchesServer(entry)
      ),
    [searchedEntries, matchesLevel, matchesContext, matchesServer]
  );

  /** Every entry matching the filters — what Copy and Save act on. */
  const filteredLogs = useMemo(
    () => timelineEntries.filter(matchesTimeRange),
    [timelineEntries, matchesTimeRange]
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
  }, [
    debouncedSearchFilter,
    levelFilters,
    contextFilters,
    serverFilters,
    timeRange,
  ]);

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
      (isFacetNarrowed(levelFilters) ? 1 : 0) +
      (isFacetNarrowed(contextFilters) ? 1 : 0) +
      (isFacetNarrowed(serverFilters) ? 1 : 0) +
      (timeRange !== null ? 1 : 0),
    [
      debouncedSearchFilter,
      levelFilters,
      contextFilters,
      serverFilters,
      timeRange,
    ]
  );

  const handleToggleLevel = useCallback(
    (level: LogLevel) => {
      setLevelFilters((previous) =>
        toggleFacet(
          readFacetSelection<LogLevel>(previous),
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
        toggleFacet(readFacetSelection(previous), context, contextOptions)
      );
    },
    [contextOptions, setContextFilters]
  );

  const handleToggleServer = useCallback(
    (server: string) => {
      setServerFilters((previous) =>
        toggleFacet(readFacetSelection(previous), server, serverOptions)
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
          // Workspace titles are often the raw address; strip the scheme and
          // trailing slashes here so the sidebar labels and the tag on every
          // row read the same way the workspace tabs do.
          setServerMapping(
            Object.fromEntries(
              Object.entries(response.mapping).map(([host, title]) => [
                host,
                formatServerTitle(title || host),
              ])
            )
          );
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

          if (isSuspendedRef.current) {
            setPendingNewEntryCount((prev) => prev + newEntries.length);
          }

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
    isSuspendedRef.current = autoScroll && userHasScrolled;
    if (!isSuspendedRef.current) {
      setPendingNewEntryCount(0);
    }
  }, [autoScroll, userHasScrolled]);

  useEffect(() => {
    if (
      autoScroll &&
      !userHasScrolled &&
      logEntries.length > 0 &&
      virtuosoRef.current
    ) {
      const timeoutId = setTimeout(() => {
        isAutoScrollingRef.current = true;
        lastAutoScrollAtRef.current = Date.now();
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
    if (Date.now() - lastAutoScrollAtRef.current < AUTO_SCROLL_GUARD_MS) return;
    if (autoScroll && !userHasScrolled) {
      setUserHasScrolled(true);
    }
  }, [autoScroll, userHasScrolled]);

  const handleResumeAutoScroll = useCallback(() => {
    setUserHasScrolled(false);
    setPendingNewEntryCount(0);
    if (virtuosoRef.current) {
      isAutoScrollingRef.current = true;
      lastAutoScrollAtRef.current = Date.now();
      virtuosoRef.current.scrollToIndex({ index: 0, behavior: 'smooth' });
      isAutoScrollingRef.current = false;
    }
  }, []);

  const handleCopyEntry = useCallback((entry: LogEntryType) => {
    navigator.clipboard.writeText(entry.raw).catch((error) => {
      console.error('Failed to copy entry to clipboard:', error);
    });
  }, []);

  const renderDayGroup = useCallback(
    (groupIndex: number) => (
      <DayHeader
        label={dayGroups[groupIndex]?.label ?? ''}
        trailing={dayGroups[groupIndex]?.count}
        surfaces={surfaces}
        blurred={isTransparent}
      />
    ),
    [dayGroups, surfaces, isTransparent]
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
        setTimeRange(null);
        setLoadError(null);

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
    setTimeRange(null);
    setLoadError(null);

    setCurrentLogFile({
      filePath: undefined,
      fileName: 'main.log',
      isDefaultLog: true,
    });
  }, []);

  const handleRevealLogFile = useCallback(async () => {
    try {
      const response = (await ipcRenderer.invoke(
        'log-viewer-window/reveal-log-file',
        {
          filePath: currentLogFile.isDefaultLog
            ? undefined
            : currentLogFile.filePath,
        }
      )) as { success: boolean; error?: string };
      if (!response?.success) {
        console.error('Failed to reveal log file:', response?.error);
      }
    } catch (error) {
      console.error('Failed to reveal log file:', error);
    }
  }, [currentLogFile.filePath, currentLogFile.isDefaultLog]);

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
    setSaveError(null);
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
        acknowledgeSave();
      } else if (response?.canceled) {
        // User dismissed the save dialog — not an error, stay silent.
      } else if (response?.error) {
        console.error('Failed to save logs:', response.error);
        setSaveError(response.error);
      }
    } catch (error) {
      console.error('Failed to save logs:', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : t('logViewer.messages.saveFailed')
      );
    }
  }, [filteredLogs, acknowledgeSave, t]);

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
  }, [searchFilter, handleSaveLogs]);

  return (
    <TooltipProvider>
      <WindowChromeGlobalStyles
        paletteTheme={paletteTheme}
        surfaces={surfaces}
      />
      <LogViewerGlobalStyles surfaces={surfaces} />
      <Box
        display='flex'
        flexDirection='column'
        height='100vh'
        width='100%'
        style={{ backgroundColor: surfaces.panel }}
      >
        <LogViewerToolbar
          fileName={currentLogFile.fileName}
          filePath={currentLogFile.filePath}
          isDefaultLog={currentLogFile.isDefaultLog}
          isLoading={isLoading}
          isStreaming={isStreaming}
          onOpenLogFile={handleOpenLogFile}
          onOpenDefaultLog={handleOpenDefaultLog}
          onRevealLogFile={handleRevealLogFile}
          onRefresh={handleRefresh}
          onToggleStreaming={handleToggleStreaming}
          onCopy={handleCopyLogs}
          onSave={handleSaveLogs}
          hasSaved={hasSaved}
        />

        {saveError && (
          <Box padding='x8'>
            <Callout
              type='danger'
              actions={
                <IconButton
                  small
                  icon='cross'
                  title={t('logViewer.buttons.dismissError')}
                  aria-label={t('logViewer.buttons.dismissError')}
                  onClick={() => setSaveError(null)}
                />
              }
            >
              {saveError}
            </Callout>
          </Box>
        )}

        <Box
          display='flex'
          flexDirection='row'
          flexGrow={1}
          style={{ minHeight: 0 }}
        >
          <LogViewerSidebar
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
            showTimeline={showTimeline}
            onToggleShowTimeline={() => setShowTimeline(!showTimeline)}
            onSelectAllLevels={() => setLevelFilters(null)}
            onSelectAllContexts={() => setContextFilters(null)}
            onSelectAllServers={() => setServerFilters(null)}
          />

          <Box
            flexGrow={1}
            display='flex'
            flexDirection='column'
            style={{ minWidth: 0, minHeight: 0 }}
          >
            <Box
              flexGrow={1}
              display='flex'
              flexDirection='column'
              style={{
                minWidth: 0,
                minHeight: 0,
                ...cardStyle,
                // The status bar below supplies this gap, so the card's own
                // bottom margin would double it.
                marginBlockEnd: 0,
              }}
            >
              {showTimeline && !loadError && timelineEntries.length > 0 && (
                <LogTimeline
                  entries={timelineEntries}
                  surfaces={surfaces}
                  selectedRange={timeRange}
                  onSelectRange={setTimeRange}
                />
              )}
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
              {!isLoading && loadError && (
                <Box
                  display='flex'
                  justifyContent='center'
                  alignItems='center'
                  flexGrow={1}
                >
                  <Callout type='danger' width='x368' maxWidth='100%'>
                    <Box marginBlockEnd='x8'>{loadError}</Box>
                    <Button small onClick={handleRefresh}>
                      {t('logViewer.buttons.retry')}
                    </Button>
                  </Callout>
                </Box>
              )}
              {!isLoading && !loadError && visibleLogs.length === 0 && (
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
              {!loadError && visibleLogs.length > 0 && (
                <Box position='relative' flexGrow={1} style={{ minHeight: 0 }}>
                  {autoScroll &&
                    userHasScrolled &&
                    pendingNewEntryCount > 0 && (
                      <Box
                        is='button'
                        type='button'
                        onClick={handleResumeAutoScroll}
                        position='absolute'
                        insetBlockStart='x8'
                        insetInlineStart='50%'
                        style={{
                          transform: 'translateX(-50%)',
                          cursor: 'pointer',
                        }}
                        zIndex={10}
                        pi='x12'
                        pb='x6'
                        borderRadius='x24'
                        backgroundColor='status-background-info'
                        color='status-font-on-info'
                        fontScale='c1'
                        display='flex'
                        alignItems='center'
                        border='none'
                      >
                        <Icon name='arrow-up' size='x12' />
                        <Box marginInlineStart='x4'>
                          {t('logViewer.messages.newEntriesPaused', {
                            count: pendingNewEntryCount,
                          })}
                        </Box>
                      </Box>
                    )}
                  <GroupedVirtuoso
                    ref={virtuosoRef}
                    data={visibleLogs}
                    groupCounts={dayGroupCounts}
                    groupContent={renderDayGroup}
                    // Group header rows share the flat index space with entries but
                    // have no data item, so `entry` is undefined for them.
                    computeItemKey={(index, entry) =>
                      entry?.id ?? `day-${index}`
                    }
                    itemContent={renderLogEntry}
                    overscan={VIRTUOSO_OVERSCAN}
                    style={{ height: '100%', width: '100%' }}
                    onScroll={handleScroll}
                    endReached={handleEndReached}
                  />
                </Box>
              )}
            </Box>

            <LogStatusBar
              shownCount={filteredLogs.length}
              loadedCount={logEntries.length}
              fileSize={fileInfo?.size}
              dateRange={fileInfo?.dateRange}
              filePath={currentLogFile.filePath}
              isStreaming={isStreaming}
              isLoading={isLoading}
              canClear={currentLogFile.isDefaultLog && logEntries.length > 0}
              onClearLogs={handleClearLogs}
            />
          </Box>
        </Box>
      </Box>
    </TooltipProvider>
  );
}

export default LogViewerWindow;
