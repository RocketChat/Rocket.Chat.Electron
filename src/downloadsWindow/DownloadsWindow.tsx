import {
  Box,
  Scrollable,
  States,
  StatesAction,
  StatesActions,
  StatesIcon,
  StatesSubtitle,
  StatesTitle,
} from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ChangeEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { DOWNLOADS_CLEARED } from '../downloads/actions';
import type { Download } from '../downloads/common';
import { DownloadStatus } from '../downloads/common';
import { invoke } from '../ipc/renderer';
import { dispatch } from '../store';
import type { RootState } from '../store/rootReducer';
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
import { useTransparency } from '../ui/windowChrome/useTransparency';
import { DownloadRow } from './DownloadRow';
import { DownloadsSidebar } from './DownloadsSidebar';
import type { FacetOption } from './DownloadsSidebar';
import { DownloadsStatusBar } from './DownloadsStatusBar';
import { DownloadsToolbar } from './DownloadsToolbar';
import { TRANSPARENCY_CHANNEL } from './constants';
import { formatDayLabel, groupDownloadsByDay } from './grouping';
import { DownloadsGlobalStyles } from './styles';

/** Top-level MIME groups worth offering as a facet. */
const MIME_GROUPS = ['image', 'video', 'audio', 'text', 'application'];

const getMimeGroup = (download: Download): string =>
  download.mimeType?.split('/')?.[0] || 'other';

const STATUSES = [DownloadStatus.PAUSED, DownloadStatus.CANCELLED] as const;

type DownloadsWindowProps = {
  paletteTheme: PaletteTheme;
};

export const DownloadsWindow = ({ paletteTheme }: DownloadsWindowProps) => {
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

  const downloadsState = useSelector(({ downloads }: RootState) => downloads);
  const allDownloads = useMemo(
    () =>
      Object.values(downloadsState).sort(
        (a: Download, b: Download) => b.itemId - a.itemId
      ),
    [downloadsState]
  );

  const [searchFilter, setSearchFilter] = useState('');
  const [storedServerFilters, setServerFilters] =
    useLocalStorage<FacetSelection>('downloads-window/servers', null);
  const [storedTypeFilters, setTypeFilters] = useLocalStorage<FacetSelection>(
    'downloads-window/types',
    null
  );
  const [storedStatusFilters, setStatusFilters] =
    useLocalStorage<FacetSelection>('downloads-window/statuses', null);

  const serverFilters = useMemo(
    () => readFacetSelection(storedServerFilters),
    [storedServerFilters]
  );
  const typeFilters = useMemo(
    () => readFacetSelection(storedTypeFilters),
    [storedTypeFilters]
  );
  const statusFilters = useMemo(
    () => readFacetSelection(storedStatusFilters),
    [storedStatusFilters]
  );

  const handleSearchFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchFilter(event.target.value);
    },
    []
  );

  const matchesSearch = useCallback(
    (download: Download): boolean =>
      !searchFilter ||
      download.fileName.toLowerCase().includes(searchFilter.toLowerCase()),
    [searchFilter]
  );

  const matchesServer = useCallback(
    (download: Download): boolean =>
      isFacetSelected(serverFilters, download.serverUrl),
    [serverFilters]
  );

  const matchesType = useCallback(
    (download: Download): boolean =>
      isFacetSelected(typeFilters, getMimeGroup(download)),
    [typeFilters]
  );

  const matchesStatus = useCallback(
    (download: Download): boolean =>
      isFacetSelected(statusFilters, download.status, STATUSES),
    [statusFilters]
  );

  /** Options come from the data, so a facet never offers an empty choice. */
  const serverOptions = useMemo<FacetOption[]>(() => {
    const seen = new Map<string, string>();
    allDownloads.forEach(({ serverUrl, serverTitle }) => {
      if (!serverUrl) return;
      if (!seen.has(serverUrl)) {
        seen.set(serverUrl, formatServerTitle(serverTitle ?? serverUrl));
      }
    });
    return [...seen].map(([value, label]) => ({
      value,
      label,
      title: value,
    }));
  }, [allDownloads]);

  const typeOptions = useMemo<FacetOption[]>(() => {
    const present = new Set(allDownloads.map(getMimeGroup));
    const known = MIME_GROUPS.filter((group) => present.has(group)).map(
      (group) => ({
        value: group,
        label: t(`downloads.filters.mimes.${group}`, group),
      })
    );
    return present.has('other')
      ? [
          ...known,
          { value: 'other', label: t('downloads.filters.mimes.other') },
        ]
      : known;
  }, [allDownloads, t]);

  const statusOptions = useMemo<FacetOption[]>(() => {
    const present = new Set(allDownloads.map(({ status }) => status));
    return STATUSES.filter((status) => present.has(status)).map((status) => ({
      value: status,
      label: t(`downloads.filters.statuses.${status.toLowerCase()}`, status),
    }));
  }, [allDownloads, t]);

  /**
   * Faceted counts: each list reports what selecting it would yield with the
   * *other* filters applied, so a count is never a number you cannot reach.
   */
  const searched = useMemo(
    () => allDownloads.filter(matchesSearch),
    [allDownloads, matchesSearch]
  );

  const countBy = (items: Download[], key: (item: Download) => string) =>
    items.reduce<Record<string, number>>((counts, item) => {
      const value = key(item);
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {});

  const serverCounts = useMemo(
    () =>
      countBy(
        searched.filter((d) => matchesType(d) && matchesStatus(d)),
        (d) => d.serverUrl
      ),
    [searched, matchesType, matchesStatus]
  );

  const typeCounts = useMemo(
    () =>
      countBy(
        searched.filter((d) => matchesServer(d) && matchesStatus(d)),
        getMimeGroup
      ),
    [searched, matchesServer, matchesStatus]
  );

  const statusCounts = useMemo(
    () =>
      countBy(
        searched.filter((d) => matchesServer(d) && matchesType(d)),
        (d) => d.status
      ),
    [searched, matchesServer, matchesType]
  );

  const downloads = useMemo(
    () =>
      searched.filter(
        (d) => matchesServer(d) && matchesType(d) && matchesStatus(d)
      ),
    [searched, matchesServer, matchesType, matchesStatus]
  );

  const activeFilterCount =
    (searchFilter ? 1 : 0) +
    (isFacetNarrowed(serverFilters) ? 1 : 0) +
    (isFacetNarrowed(typeFilters) ? 1 : 0) +
    (isFacetNarrowed(statusFilters) ? 1 : 0);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setServerFilters(null);
    setTypeFilters(null);
    setStatusFilters(null);
  }, [setServerFilters, setTypeFilters, setStatusFilters]);

  const handleToggleServer = useCallback(
    (server: string) => {
      setServerFilters((previous) =>
        toggleFacet(
          readFacetSelection(previous),
          server,
          serverOptions.map(({ value }) => value)
        )
      );
    },
    [serverOptions, setServerFilters]
  );

  const handleToggleType = useCallback(
    (mimeType: string) => {
      setTypeFilters((previous) =>
        toggleFacet(
          readFacetSelection(previous),
          mimeType,
          typeOptions.map(({ value }) => value)
        )
      );
    },
    [typeOptions, setTypeFilters]
  );

  const handleToggleStatus = useCallback(
    (status: string) => {
      setStatusFilters((previous) =>
        toggleFacet(
          readFacetSelection(previous),
          status,
          statusOptions.map(({ value }) => value)
        )
      );
    },
    [statusOptions, setStatusFilters]
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await invoke('downloads-window/confirm-clear-all');
    if (!confirmed) return;
    dispatch({ type: DOWNLOADS_CLEARED });
  }, []);

  const dayGroups = useMemo(() => groupDownloadsByDay(downloads), [downloads]);
  const dayLabels = useMemo(
    () => ({
      today: t('downloads.day.today'),
      yesterday: t('downloads.day.yesterday'),
      unknown: t('downloads.day.unknown'),
    }),
    [t]
  );

  return (
    <TooltipProvider>
      <WindowChromeGlobalStyles
        paletteTheme={paletteTheme}
        surfaces={surfaces}
      />
      <DownloadsGlobalStyles />
      <Box
        display='flex'
        flexDirection='column'
        height='100vh'
        width='100%'
        style={{ backgroundColor: surfaces.panel }}
      >
        <DownloadsToolbar />

        {/*
          The sidebar runs to the bottom of the window; the status bar lives in
          the right-hand column so it starts on the same line as the list rather
          than cutting across the filters.
        */}
        <Box
          display='flex'
          flexDirection='row'
          flexGrow={1}
          style={{ minHeight: 0 }}
        >
          <DownloadsSidebar
            searchFilter={searchFilter}
            onSearchFilterChange={handleSearchFilterChange}
            serverOptions={serverOptions}
            serverFilters={serverFilters}
            serverCounts={serverCounts}
            onToggleServer={handleToggleServer}
            typeOptions={typeOptions}
            typeFilters={typeFilters}
            typeCounts={typeCounts}
            onToggleType={handleToggleType}
            statusOptions={statusOptions}
            statusFilters={statusFilters}
            statusCounts={statusCounts}
            onToggleStatus={handleToggleStatus}
            onSelectAllServers={() => setServerFilters(null)}
            onSelectAllTypes={() => setTypeFilters(null)}
            onSelectAllStatuses={() => setStatusFilters(null)}
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
              {downloads.length === 0 ? (
                <Box
                  display='flex'
                  justifyContent='center'
                  alignItems='center'
                  flexGrow={1}
                >
                  <States>
                    <StatesIcon
                      name={
                        activeFilterCount > 0
                          ? 'magnifier'
                          : 'circle-arrow-down'
                      }
                    />
                    <StatesTitle>
                      {activeFilterCount > 0
                        ? t('downloads.noResults.title')
                        : t('downloads.empty.title')}
                    </StatesTitle>
                    <StatesSubtitle>
                      {activeFilterCount > 0
                        ? t('downloads.noResults.subtitle')
                        : t('downloads.empty.subtitle')}
                    </StatesSubtitle>
                    {activeFilterCount > 0 && (
                      <StatesActions>
                        <StatesAction onClick={handleClearFilters}>
                          {t('downloads.clearFilters')}
                        </StatesAction>
                      </StatesActions>
                    )}
                  </States>
                </Box>
              ) : (
                <Scrollable vertical>
                  <Box>
                    {dayGroups.map((group) => (
                      <Box key={group.day || 'unknown'}>
                        <DayHeader
                          sticky
                          label={formatDayLabel(
                            group.day,
                            new Date(),
                            dayLabels
                          )}
                          trailing={group.items.length}
                          surfaces={surfaces}
                          blurred={isTransparent}
                        />
                        {group.items.map((download) => (
                          <DownloadRow
                            key={download.itemId}
                            download={download}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Scrollable>
              )}
            </Box>

            <DownloadsStatusBar
              shownCount={downloads.length}
              totalCount={allDownloads.length}
              canClear={allDownloads.length > 0}
              onClearAll={handleClearAll}
            />
          </Box>
        </Box>
      </Box>
    </TooltipProvider>
  );
};
