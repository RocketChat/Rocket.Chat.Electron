import {
  Box,
  Button,
  SearchInput,
  Icon,
  Pagination,
  Scrollable,
  IconButton,
  Select,
} from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ChangeEvent, Key, KeyboardEvent } from 'react';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { Download } from '../../../downloads/common';
import { DownloadStatus } from '../../../downloads/common';
import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import { DOWNLOADS_BACK_BUTTON_CLICKED } from '../../actions';
import DownloadItem from './DownloadItem';

const DownloadsManagerView = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'downloads'
  );

  const [searchFilter, setSearchFilter] = useLocalStorage(
    'download-search',
    ''
  );

  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
  );

  const lastSelectedServerUrl = useSelector(
    ({ lastSelectedServerUrl }: RootState) => lastSelectedServerUrl
  );

  const handleSearchFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchFilter(event.target.value);
    },
    [setSearchFilter]
  );

  const { t } = useTranslation();

  const serverFilterOptions = useSelector<RootState, [string, string][]>(
    ({ downloads }) => [
      ['*', t('downloads.filters.all')],
      ...Object.values(downloads)
        .filter(({ serverUrl, serverTitle }) => serverUrl && serverTitle)
        .map<[string, string]>(({ serverUrl, serverTitle }) => [
          serverUrl,
          serverTitle ?? serverUrl,
        ])
        .filter(
          (value, index, array) =>
            array.findIndex((valueTwo) => valueTwo[0] === value[0]) === index
        ),
    ]
  );

  const [serverFilter, setServerFilter] = useLocalStorage<
    (typeof serverFilterOptions)[number][0]
  >('download-server', '');

  const handleServerFilterChange = useCallback(
    (value: Key) => {
      setServerFilter(String(value));
    },
    [setServerFilter]
  );

  const mimeTypeOptions = useMemo<[string, string][]>(
    () => [
      ['*', t('downloads.filters.all')],
      ['image', t('downloads.filters.mimes.images')],
      ['video', t('downloads.filters.mimes.videos')],
      ['audio', t('downloads.filters.mimes.audios')],
      ['text', t('downloads.filters.mimes.texts')],
      ['application', t('downloads.filters.mimes.files')],
    ],
    [t]
  );

  const [mimeTypeFilter, setMimeTypeFilter] = useLocalStorage<
    (typeof mimeTypeOptions)[number][0]
  >('download-type', '');

  const handleMimeFilter = useCallback(
    (value: Key) => {
      setMimeTypeFilter(String(value));
    },
    [setMimeTypeFilter]
  );

  const statusFilterOptions = useMemo<[string, string][]>(
    () => [
      [DownloadStatus.ALL, t('downloads.filters.all')],
      [DownloadStatus.PAUSED, t('downloads.filters.statuses.paused')],
      [DownloadStatus.CANCELLED, t('downloads.filters.statuses.cancelled')],
    ],
    [t]
  );

  const [statusFilter, setStatusFilter] = useLocalStorage<
    (typeof statusFilterOptions)[number][0]
  >('download-tab', DownloadStatus.ALL);

  const handleTabChange = useCallback(
    (value: Key) => {
      setStatusFilter(String(value));
    },
    [setStatusFilter]
  );

  const hasActiveFilters =
    Boolean(searchFilter) ||
    (serverFilter !== '' && serverFilter !== '*') ||
    (mimeTypeFilter !== '' && mimeTypeFilter !== '*') ||
    (statusFilter !== '' && statusFilter !== DownloadStatus.ALL);

  const handleClearAll = useCallback((): void => {
    setSearchFilter('');
    setMimeTypeFilter('');
    setServerFilter('');
    setStatusFilter(DownloadStatus.ALL);
  }, [setSearchFilter, setMimeTypeFilter, setServerFilter, setStatusFilter]);

  const [itemsPerPage, setItemsPerPage] = useState<25 | 50 | 100>(25);
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
      t('downloads.showingResults', {
        first: current + 1,
        last: Math.min(current + itemsPerPage, count),
        count,
      }),
    [t]
  );

  const totalDownloads = useSelector(
    ({ downloads }: RootState) => Object.keys(downloads).length
  );

  const downloads = useSelector(({ downloads }: RootState) => {
    type Predicate = (download: Download) => boolean;
    const searchPredicate: Predicate = searchFilter
      ? ({ fileName }) => fileName.indexOf(searchFilter) > -1
      : () => true;
    const serverPredicate: Predicate =
      serverFilter !== '' && serverFilter !== '*'
        ? ({ serverUrl }) => serverUrl === serverFilter
        : () => true;
    const mimeTypePredicate: Predicate =
      mimeTypeFilter !== '' && mimeTypeFilter !== '*'
        ? ({ mimeType }) => mimeType?.split('/')?.[0] === mimeTypeFilter
        : () => true;
    const statusPredicate: Predicate =
      statusFilter !== '' && statusFilter !== DownloadStatus.ALL
        ? ({ status }) => status === statusFilter
        : () => true;
    return Object.values(downloads)
      .filter(searchPredicate)
      .filter(serverPredicate)
      .filter(mimeTypePredicate)
      .filter(statusPredicate)
      .sort((a, b) => b.itemId - a.itemId);
  });

  const handleBackButton = useCallback((): void => {
    dispatch({
      type: DOWNLOADS_BACK_BUTTON_CLICKED,
      payload: lastSelectedServerUrl,
    });
  }, [lastSelectedServerUrl]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        handleBackButton();
      }
    },
    [handleBackButton]
  );

  const isEmpty = downloads.length === 0;
  const noDownloadsAtAll = totalDownloads === 0;

  return (
    <Box
      className='rcx-sidebar--main'
      display={isVisible ? 'flex' : 'none'}
      position='absolute'
      flexDirection='column'
      height='full'
      width='full'
      bg='room'
      onKeyDown={handleKeyDown}
      tabIndex={isVisible ? -1 : undefined}
    >
      <Box
        pi={24}
        pbs={24}
        pbe={16}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
        fontScale='h2'
        color='font-default'
      >
        {!isSideBarEnabled && (
          <Box mie={8} display='flex' alignItems='center'>
            <IconButton
              icon='arrow-back'
              onClick={handleBackButton}
              aria-label={t('downloads.back')}
            />
          </Box>
        )}
        {t('downloads.title')}
      </Box>

      <Box display='flex' alignItems='center' pi={24} pbe={16}>
        <Box flexGrow={3} flexShrink={1} flexBasis={0} minWidth='x160' mie={8}>
          <SearchInput
            value={searchFilter}
            placeholder={t('downloads.filters.search')}
            addon={<Icon name='magnifier' size='x20' />}
            onChange={handleSearchFilterChange}
          />
        </Box>
        <Box flexGrow={2} flexShrink={1} flexBasis={0} minWidth='x140' mie={8}>
          <Select
            value={serverFilter}
            placeholder={t('downloads.filters.server')}
            options={serverFilterOptions}
            onChange={handleServerFilterChange}
          />
        </Box>
        <Box flexGrow={2} flexShrink={1} flexBasis={0} minWidth='x120' mie={8}>
          <Select
            value={mimeTypeFilter}
            placeholder={t('downloads.filters.mimeType')}
            options={mimeTypeOptions}
            onChange={handleMimeFilter}
          />
        </Box>
        <Box flexGrow={2} flexShrink={1} flexBasis={0} minWidth='x120' mie={8}>
          <Select
            value={statusFilter}
            placeholder={t('downloads.filters.status')}
            options={statusFilterOptions}
            onChange={handleTabChange}
          />
        </Box>
        <IconButton
          icon='cross'
          aria-label={t('downloads.filters.clear')}
          title={t('downloads.filters.clear')}
          disabled={!hasActiveFilters}
          onClick={handleClearAll}
        />
      </Box>

      <Scrollable>
        <Box flexGrow={1} flexShrink={1} pi={24} pbs={16} pbe={16}>
          {isEmpty ? (
            <Box
              display='flex'
              flexDirection='column'
              alignItems='center'
              justifyContent='center'
              pb={64}
              pbs={64}
            >
              <Box fontScale='h4' color='font-default' mbe={8}>
                {noDownloadsAtAll
                  ? t('downloads.empty.noDownloads')
                  : t('downloads.empty.noResults')}
              </Box>
              <Box
                fontScale='p2'
                color='font-secondary-info'
                mbe={hasActiveFilters ? 16 : 0}
                style={{ maxWidth: '48ch', textAlign: 'center' }}
              >
                {noDownloadsAtAll
                  ? t('downloads.empty.noDownloadsDescription')
                  : ''}
              </Box>
              {hasActiveFilters && (
                <Button small onClick={handleClearAll}>
                  {t('downloads.empty.noResultsAction')}
                </Button>
              )}
            </Box>
          ) : (
            downloads
              .slice(currentPagination, currentPagination + itemsPerPage)
              .map((downloadItem) => (
                <DownloadItem key={downloadItem.itemId} {...downloadItem} />
              ))
          )}
        </Box>
      </Scrollable>

      {downloads.length > 0 && (
        <Pagination
          divider
          current={currentPagination}
          itemsPerPage={itemsPerPage}
          count={downloads?.length || 0}
          showingResultsLabel={showingResultsLabel}
          onSetItemsPerPage={setItemsPerPage}
          onSetCurrent={setCurrentPagination}
        />
      )}
    </Box>
  );
};

export default DownloadsManagerView;
