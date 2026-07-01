import {
  Box,
  Field,
  FieldRow,
  SearchInput,
  Icon,
  Pagination,
  Scrollable,
  IconButton,
  Select,
  States,
  StatesIcon,
  StatesTitle,
  StatesSubtitle,
} from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ChangeEvent, Key } from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
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

  const downloadsState = useSelector(({ downloads }: RootState) => downloads);

  const serverFilterOptions = useMemo<[string, string][]>(
    () => [
      ['*', t('downloads.filters.all')],
      ...Object.values(downloadsState)
        .filter(({ serverUrl, serverTitle }) => serverUrl && serverTitle)
        .map<[string, string]>(({ serverUrl, serverTitle }) => [
          serverUrl,
          serverTitle ?? serverUrl,
        ])
        .filter(
          (value, index, array) =>
            array.findIndex((valueTwo) => valueTwo[0] === value[0]) === index
        ),
    ],
    [downloadsState, t]
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

  const hasActiveFilters =
    !!searchFilter ||
    (serverFilter !== '' && serverFilter !== '*') ||
    (mimeTypeFilter !== '' && mimeTypeFilter !== '*') ||
    (statusFilter !== '' && statusFilter !== DownloadStatus.ALL);

  const downloads = useMemo(() => {
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
    return Object.values(downloadsState)
      .filter(searchPredicate)
      .filter(serverPredicate)
      .filter(mimeTypePredicate)
      .filter(statusPredicate)
      .sort((a, b) => b.itemId - a.itemId);
  }, [
    downloadsState,
    searchFilter,
    serverFilter,
    mimeTypeFilter,
    statusFilter,
  ]);

  // Reset to the first page whenever the current offset falls outside the
  // (filtered) result set — e.g. after narrowing a filter or removing items —
  // so the list never renders a blank page past the end.
  useEffect(() => {
    if (currentPagination > 0 && currentPagination >= downloads.length) {
      setCurrentPagination(0);
    }
  }, [currentPagination, downloads.length]);

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
        minHeight='x64'
        pi='x24'
        pbs='x24'
        pbe='x16'
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
      >
        {!isSideBarEnabled && (
          <IconButton
            icon='arrow-back'
            onClick={handleBackButton}
            mie='x8'
            aria-label={t('documentViewer.back')}
          />
        )}
        <Box is='div' color='default' fontScale='h1'>
          {t('downloads.title')}
        </Box>
      </Box>
      <Box display='flex' alignItems='center' pi='x24' pbe='x16'>
        <Field flexGrow={7} flexShrink={7} flexBasis='0' mie='x8'>
          <FieldRow>
            <SearchInput
              value={searchFilter}
              placeholder={t('downloads.filters.search')}
              addon={<Icon name='magnifier' size='x20' />}
              onChange={handleSearchFilterChange}
              aria-label={t('downloads.filters.search')}
            />
          </FieldRow>
        </Field>
        <Field flexGrow={3} flexShrink={3} flexBasis='0' mie='x8'>
          <FieldRow>
            <Select
              value={serverFilter}
              placeholder={t('downloads.filters.server')}
              options={serverFilterOptions}
              onChange={handleServerFilterChange}
              aria-label={t('downloads.filters.server')}
            />
          </FieldRow>
        </Field>
        <Field flexGrow={3} flexShrink={3} flexBasis='0' mie='x8'>
          <FieldRow>
            <Select
              value={mimeTypeFilter}
              placeholder={t('downloads.filters.mimeType')}
              options={mimeTypeOptions}
              onChange={handleMimeFilter}
              aria-label={t('downloads.filters.mimeType')}
            />
          </FieldRow>
        </Field>
        <Field flexGrow={3} flexShrink={3} flexBasis='0' mie='x8'>
          <FieldRow>
            <Select
              value={statusFilter}
              placeholder={t('downloads.filters.status')}
              options={statusFilterOptions}
              onChange={handleTabChange}
              aria-label={t('downloads.filters.status')}
            />
          </FieldRow>
        </Field>
        <IconButton
          icon='trash'
          title={t('downloads.filters.clear')}
          onClick={handleClearAll}
        />
      </Box>
      <Scrollable>
        <Box flexGrow={1} flexShrink={1} pi='x24' pbe='x16'>
          {downloads.length === 0 ? (
            <States>
              <StatesIcon
                name={hasActiveFilters ? 'magnifier' : 'circle-arrow-down'}
              />
              <StatesTitle>
                {hasActiveFilters
                  ? t('downloads.noResults.title')
                  : t('downloads.empty.title')}
              </StatesTitle>
              <StatesSubtitle>
                {hasActiveFilters
                  ? t('downloads.noResults.subtitle')
                  : t('downloads.empty.subtitle')}
              </StatesSubtitle>
            </States>
          ) : (
            <Box>
              {downloads
                .slice(currentPagination, currentPagination + itemsPerPage)
                .map((downloadItem) => (
                  <DownloadItem key={downloadItem.itemId} {...downloadItem} />
                ))}
            </Box>
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
