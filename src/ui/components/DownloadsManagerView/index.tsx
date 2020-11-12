import { Box, Grid, SearchInput, Select, Icon, Button, Pagination, Divider, PaginationProps } from '@rocket.chat/fuselage';
import { useLocalStorage, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useState, useMemo, useCallback, FC, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { DownloadStatus } from '../../../downloads/common';
import { RootState } from '../../../store/rootReducer';
import DownloadItem from './DownloadItem';
import { mapping } from './downloadUtils';
import { Wrapper } from './styles';

const fileTypes = [
  ['all', 'All'],
  ['images', 'Images'],
  ['videos', 'Videos'],
  ['audios', 'Audios'],
  ['text', 'Texts'],
  ['files', 'Files'],
] as const;

const fileStatus = [
  [DownloadStatus.ALL, 'All'],
  [DownloadStatus.PAUSED, 'Paused'],
  [DownloadStatus.CANCELLED, 'Cancelled'],
] as const;

const DownloadsManagerView: FC = () => {
  const isVisible = useSelector(({ currentView }: RootState) => currentView === 'downloads');
  const serverOptions = useSelector<RootState, [string, string][]>(({ servers }) => [
    ['all', 'All'],
    ...servers.map<[string, string]>((server) => [server.title, server.title]),
  ]);
  const downloads = useSelector(({ downloads }: RootState) => Object.values(downloads));

  const { t } = useTranslation();

  const [tab, setTab] = useLocalStorage<typeof DownloadStatus[keyof typeof DownloadStatus] | ''>('download-tab', DownloadStatus.ALL);
  const [searchVal, setSearchVal] = useState('');
  const [serverVal, setServerVal] = useLocalStorage('download-server', '');
  const [typeVal, setTypeVal] = useLocalStorage('download-type', '');
  const [currentPagination, setCurrentPagination] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<PaginationProps['itemsPerPage']>(25);

  const handleTabChange = useMutableCallback((event) => {
    setTab(event);
  });

  const handleSearch = useMutableCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchVal(event.target.value);
  });

  const handleServerFilter = useMutableCallback((event) => {
    setServerVal(event);
  });

  const handleMimeFilter = useMutableCallback((event) => {
    setTypeVal(event);
  });

  // Modal Action

  const handleClearAll = useCallback((): void => {
    setSearchVal('');
    setTypeVal('');
    setServerVal('');
    setTab('');
  }, [setServerVal, setTab, setTypeVal]);

  const showingResultsLabel = useCallback(({ count, current, itemsPerPage }) => `Showing results ${ current + 1 } - ${ Math.min(current + itemsPerPage, count) } of ${ count }`, []);

  const filteredDownloads = useMemo(() => {
    const searchRegex = searchVal && new RegExp(`${ searchVal }`, 'gi');
    return downloads.filter((download) => (!searchRegex || searchRegex.test(download.fileName)) && (!tab || tab === DownloadStatus.ALL || download.status === tab) && (!serverVal || serverVal === 'all' || serverVal === download.serverTitle) && (!typeVal || typeVal === 'all' || mapping[download.mimeType.split('/')[0]] === typeVal)).sort((a, b) => b.itemId - a.itemId);
  }, [searchVal, downloads, tab, serverVal, typeVal]);

  return <Wrapper visible={isVisible}>
    <Box
      minHeight='x64'
      paddingBlock='x16'
      paddingInline='x162'
      display='flex'
      flexDirection='row'
      flexWrap='nowrap'
      alignItems='center'
      color='neutral-800'
    >
      <Box is='h1' fontScale='h1' flexGrow={1}>{t('Downloads')}</Box>
    </Box>
    <Divider />
    <Box paddingInline='x162'>

      <Box display='flex' justifyContent='space-between' alignItems='center' mb='x40' height='x40'>
        <Box display='flex' mie='x8' width='35%' >
          <SearchInput value={searchVal} onChange={ handleSearch } placeholder='Search' addon={ <Icon color='neutral-700' name='magnifier' size='x20' /> } />
        </Box>
        <Select mie='x8' width='20%' value={serverVal} onChange={ handleServerFilter } placeholder='Filter by Server' options={ serverOptions } />
        <Select mie='x8' width='20%' value={typeVal} onChange={ handleMimeFilter } placeholder='Filter by File type' options={ fileTypes } />
        <Select mie='x8' width='20%' value={tab} onChange={ handleTabChange } placeholder='Filter by File Status' options={ fileStatus } />
        <Box display='flex'>
          <Button small ghost onClick={handleClearAll}>
            <Icon color='neutral-700' name='trash' size='x24' title='Clear Filters' />
          </Button>
        </Box>
      </Box>
      <Grid xl={ true } maxHeight='75vh' overflowY='scroll' >
        <Grid.Item xl={ 12 } style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
          { filteredDownloads.slice(currentPagination, currentPagination + itemsPerPage).map((downloadItem) =>
            <DownloadItem
              key={downloadItem.itemId}
              {...downloadItem}
            />,
          ) }
        </Grid.Item>
      </Grid>
    </Box>
    <Pagination
      divider
      paddingInline='x162'
      current={currentPagination}
      itemsPerPage={itemsPerPage}
      showingResultsLabel={showingResultsLabel}
      count={(filteredDownloads && filteredDownloads.length) || 0}
      onSetItemsPerPage={setItemsPerPage}
      onSetCurrent={setCurrentPagination}
    />
  </Wrapper>;
};

export default DownloadsManagerView;
