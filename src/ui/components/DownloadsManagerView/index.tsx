import { Box, Grid, SearchInput, Select, Icon, Button, Pagination, Divider, PaginationProps } from '@rocket.chat/fuselage';
import { useLocalStorage, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { ipcRenderer, IpcRendererEvent, shell } from 'electron';
import React, { useState, useEffect, useMemo, useCallback, FC, ReactElement, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import DownloadItem from './DownloadItem';
import WarningModal from './WarningModal';
import { mapping, STATUS, DOWNLOAD_EVENT, Download } from './downloadUtils';
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
  [STATUS.ALL, 'All'],
  [STATUS.PAUSED, 'Paused'],
  [STATUS.CANCELLED, 'Cancelled'],
] as const;

const DownloadsManagerView: FC = () => {
  const { t } = useTranslation();
  const isVisible = useSelector(({ currentView }: RootState) => currentView === 'downloads');
  const servers = useSelector(({ servers }: RootState) => servers);
  const serverOptions: [string, string][] = [['all', 'All']];
  servers.forEach((server) => {
    serverOptions.push([server.title, server.title]);
  });

  // Downloads Array
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [modal, setModal] = useState<ReactElement>();

  const [tab, setTab] = useLocalStorage<typeof STATUS[keyof typeof STATUS] | ''>('download-tab', STATUS.ALL);
  const [searchVal, setSearchVal] = useState('');
  const [serverVal, setServerVal] = useLocalStorage('download-server', '');
  const [typeVal, setTypeVal] = useLocalStorage('download-type', '');
  const [currentPagination, setCurrentPagination] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<PaginationProps['itemsPerPage']>(25);

  const handleFileOpen = useMutableCallback((path: string) => {
    shell.showItemInFolder(path);
  });

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

  const updateDownloads = useMutableCallback((data) => {
    const updatedDownloads = downloads.map((downloadItem) => {
      if (downloadItem.itemId === data.itemId) {
        for (const key of Object.keys(data)) {
          downloadItem[key] = data[key];
        }
      }
      return downloadItem;
    });
    setDownloads(updatedDownloads);
  });

  // Modal Action

  const closeModal = useCallback(() => {
    setModal(null);
  }, [setModal]);

  const handleClearAll = useCallback((): void => {
    setSearchVal('');
    setTypeVal('');
    setServerVal('');
    setTab('');
  }, [setServerVal, setTab, setTypeVal]);


  const handleClear = useCallback((itemId: string, isRetry: boolean): void => {
    const clear = (): void => {
      closeModal();
      const newDownloads = downloads.filter((download) => download.itemId !== itemId);
      setDownloads(newDownloads);
      ipcRenderer.send('remove', itemId);
    };

    if (isRetry) {
      clear();
      return;
    }
    setModal(<WarningModal
      close={ closeModal }
      confirm={ clear }
      text={ 'Remove this download?' }
      confirmText={ 'Yes' }
    />);
  }, [closeModal, downloads]);

  // 			USE EFFECTS

  useEffect(() => {
    ipcRenderer.send(DOWNLOAD_EVENT.LOAD);
  }, []);

  useEffect(() => {
    const intializeDownloads = (_event: IpcRendererEvent, downloads: Record<string, Download>): void => {
      setDownloads(Object.values(downloads) as Download[]);
    };
    ipcRenderer.on(DOWNLOAD_EVENT.INITIALIZE, intializeDownloads);
    return () => {
      ipcRenderer.removeListener(DOWNLOAD_EVENT.INITIALIZE, intializeDownloads);
    };
  }, []);

  useEffect(() => {
    const createDownload = (_event: IpcRendererEvent, download: Download): void => {
      const updatedDownloads = [...downloads];
      updatedDownloads.push(download);
      setDownloads(updatedDownloads);
    };
    ipcRenderer.on(DOWNLOAD_EVENT.CREATE, createDownload);
    return () => {
      ipcRenderer.removeListener(DOWNLOAD_EVENT.CREATE, createDownload);
    };
  }, [downloads]);

  useEffect(() => {
    const clear = (_event: unknown, itemId: string): void => {
      const newDownloads = downloads.filter((download) => download.itemId !== itemId);
      setDownloads(newDownloads);
    };
    ipcRenderer.on('download-cancelled', clear);
    return () => {
      ipcRenderer.removeListener('download-cancelled', clear);
    };
  });

  const showingResultsLabel = useCallback(({ count, current, itemsPerPage }) => `Showing results ${ current + 1 } - ${ Math.min(current + itemsPerPage, count) } of ${ count }`, []);

  const filteredDownloads = useMemo(() => {
    const searchRegex = searchVal && new RegExp(`${ searchVal }`, 'gi');
    return downloads.filter((download) => (!searchRegex || searchRegex.test(download.fileName)) && (!tab || tab === STATUS.ALL || download.status === tab) && (!serverVal || serverVal === 'all' || serverVal === download.serverTitle) && (!typeVal || typeVal === 'all' || mapping[download.mime.split('/')[0]] === typeVal)).sort((a, b) => b.itemId.localeCompare(a.itemId));
  }, [searchVal, downloads, tab, serverVal, typeVal]);

  return <>
    <Wrapper isVisible={ isVisible }>
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
      <Divider></Divider>
      <Box paddingInline='x162'>

        <Box display='flex' justifyContent='space-between' alignItems='center' mb='x40' height='x40'>
          <Box display='flex' mie='x8' width='35%' >
            <SearchInput value={searchVal} onChange={ handleSearch } placeholder='Search' addon={ <Icon color='neutral-700' name='magnifier' size='x20' /> } />
          </Box>
          <Select mie='x8' width='20%' value={serverVal} onChange={ handleServerFilter } placeholder='Filter by Server' options={ serverOptions } />
          <Select mie='x8' width='20%' value={typeVal} onChange={ handleMimeFilter } placeholder='Filter by File type' options={ fileTypes } />
          <Select mie='x8' width='20%' value={tab} onChange={ handleTabChange } placeholder='Filter by File Status' options={ fileStatus } />
          <Box display='flex'>
            <Button small ghost onClick={ handleClearAll }>
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
                updateDownloads={updateDownloads}
                handleFileOpen={handleFileOpen}
                clear={handleClear}
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
    </Wrapper>{ modal }</>;
};

export default DownloadsManagerView;
