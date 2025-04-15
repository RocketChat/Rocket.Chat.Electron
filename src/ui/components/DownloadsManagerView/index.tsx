import {
  Box,
  SearchInput,
  Icon,
  Pagination,
  Scrollable,
  IconButton,
  SelectLegacy,
} from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ChangeEvent } from 'react';
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
    (value: (typeof serverFilterOptions)[number][0]) => {
      setServerFilter(value);
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
    (value: (typeof mimeTypeOptions)[number][0]) => {
      setMimeTypeFilter(value);
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
    (value: (typeof statusFilterOptions)[number][0]) => {
      setStatusFilter(value);
    },
    [setStatusFilter]
  );

  const handleClearAll = useCallback((): void => {
    setSearchFilter('');
    setMimeTypeFilter('');
    setServerFilter('');
    setStatusFilter('');
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

  const handleBackButton = function (): void {
    dispatch({
      type: DOWNLOADS_BACK_BUTTON_CLICKED,
      payload: lastSelectedServerUrl,
    });
  };

  return (
    <Box
      className='rcx-sidebar--main'
      display={isVisible ? 'flex' : 'none'}
      position='absolute'
      flexDirection='column'
      height='full'
      width='full'
      backgroundColor='light'
    >
      <Box
        minHeight={64}
        padding={24}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
      >
        {!isSideBarEnabled && (
          <IconButton icon='arrow-back' onClick={handleBackButton} />
        )}
        <Box is='div' color='default' fontScale='h1'>
          {t('downloads.title')}
        </Box>
      </Box>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        marginBlock={8}
        padding={24}
      >
        <Box
          display='flex'
          flexGrow={7}
          flexShrink={7}
          flexBasis='0'
          paddingInline={2}
        >
          <SearchInput
            value={searchFilter}
            placeholder={t('downloads.filters.search')}
            addon={<Icon name='magnifier' size={20} />}
            onChange={handleSearchFilterChange}
          />
        </Box>
        <Box
          display='flex'
          flexGrow={3}
          flexShrink={3}
          flexBasis='0'
          paddingInline={2}
        >
          <SelectLegacy
            value={serverFilter}
            placeholder={t('downloads.filters.server')}
            options={serverFilterOptions}
            onChange={handleServerFilterChange}
          />
        </Box>
        <Box display='flex' flexGrow={3} flexShrink={3} paddingInline={2}>
          <SelectLegacy
            value={mimeTypeFilter}
            placeholder={t('downloads.filters.mimeType')}
            options={mimeTypeOptions}
            onChange={handleMimeFilter}
          />
        </Box>
        <Box display='flex' flexGrow={3} flexShrink={3} paddingInline={2}>
          <SelectLegacy
            value={statusFilter}
            placeholder={t('downloads.filters.status')}
            options={statusFilterOptions}
            onChange={handleTabChange}
          />
        </Box>
        <Box display='flex' flexGrow={1} flexShrink={1} paddingInline={2}>
          <IconButton
            icon='trash'
            title={t('downloads.filters.clear')}
            onClick={handleClearAll}
          />
        </Box>
      </Box>
      <Scrollable>
        <Box flexGrow={1} flexShrink={1} paddingBlock={8} paddingInline={64}>
          <Box>
            {downloads
              .slice(currentPagination, currentPagination + itemsPerPage)
              .map((downloadItem) => (
                <DownloadItem key={downloadItem.itemId} {...downloadItem} />
              ))}
          </Box>
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
