import { Box, Grid, SearchInput, Select, Icon, Button, Tabs, Tooltip } from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, shell } from 'electron';

import { Wrapper } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';
import { mapping, STATUS } from '../../downloadUtils';

export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	const servers = useSelector(({ servers }) => servers);
	const options = [[1, 'All']];
	servers.map((server, index) => options.push([index + 2, server.title]));
	const fileTypes = [[1, 'All'], [2, 'Images'], [3, 'Videos'], [4, 'Audios'], [5, 'Texts'], [6, 'Files']];

	// Downloads Array
	const [downloads, setDownloads] = useState([]);

	const [tab, setTab] = useLocalStorage('download-tab', STATUS.ALL);
	const [searchVal, setSearchVal] = useState('');
	const [serverVal, setServerVal] = useLocalStorage('download-server', '');
	const [typeVal, setTypeVal] = useLocalStorage('download-type', '');
	const [layout, setLayout] = useLocalStorage('download-layout', 'expanded');
	let timeHeading;

	const handleFileOpen = (path) => {
		// console.log(path);
		shell.showItemInFolder(path);
	};

	const handleTabChange = (event) => {
		// console.log(event.target.innerText);
		if (tab !== event.target.innerText) {
			setTab(event.target.innerText);
		}
	};

	const handleLayout = () => {
		if (layout === 'compact') {
			setLayout('expanded');
		} else {
			setLayout('compact');
		}
	};

	// Remove a single download from list
	const clear = (itemId) => {
		const newDownloads = downloads.filter((download) => download.itemId !== itemId);
		setDownloads(newDownloads);
		ipcRenderer.send('remove', itemId);
	};
	// Remove All downloads from list
	const clearAll = () => {
		ipcRenderer.send('reset');
	};

	const handleSearch = (event) => {
		// console.log(Boolean(event.target.value));
		if (event.target.value !== searchVal) {
			setSearchVal(event.target.value);
		}
	};

	const handleServerFilter = (index) => {
		console.log(index);
		if (options[index - 1][1] !== serverVal) {
			setServerVal(options[index - 1][1]);
		}
	};

	const handleMimeFilter = (index) => {
		console.log(index);
		if (fileTypes[index - 1][1] !== typeVal) {
			setTypeVal(fileTypes[index - 1][1]);
		}
	};


	const updateDownloads = (data) => {
		console.log(data);
		const updatedDownloads = downloads.map((downloadItem) => {
			if (downloadItem.itemId === data.itemId) {
				for (const key of Object.keys(data)) {
					downloadItem[key] = data[key];
				}
			}
			return downloadItem;
		});
		setDownloads(updatedDownloads);
	};

	// 			USE EFFECTS

	useEffect(() => {
		console.log('Loading Downloads');
		ipcRenderer.send('load-downloads');
	}, []);

	useEffect(() => {
		const intializeDownloads = (event, downloads) => {
			setDownloads(Object.values(downloads));
			console.log(Object.values(downloads));
		};
		ipcRenderer.on('initialize-downloads', intializeDownloads);
		return () => {
			ipcRenderer.removeListener('initialize-downloads', intializeDownloads);
		};
	}, []);

	useEffect(() => {
		const createDownload = (event, props) => {
			console.log('Creating New Download');
			console.log(props);
			const updatedDownloads = [...downloads];
			updatedDownloads.push(props);
			setDownloads(updatedDownloads);
		};
		ipcRenderer.on('create-download-item', createDownload);
		return () => {
			ipcRenderer.removeListener('create-download-item', createDownload);
		};
	}, [downloads]);


	const filteredDownloads = useMemo(() => {
		const searchRegex = searchVal && new RegExp(`${ searchVal }`, 'gi');
		return downloads.filter((download) => (!searchRegex || searchRegex.test(download.fileName)) && (tab === 'All Downloads' || download.status === tab) && (!serverVal || serverVal === 'All' || serverVal === download.serverTitle) && (!typeVal || typeVal === 'All' || mapping[download.mime.split('/')[0]] === typeVal)).sort((a, b) => b.itemId - a.itemId);
	}, [searchVal, downloads, tab, serverVal, typeVal]);


	return <Wrapper isVisible={ isVisible }>
		<Box p='x24'>

			<Grid xl={ true } >
				<Grid.Item xl={ 10 }>
					<Box>
						<Box fontSize='x32' lineHeight='2'>Downloads</Box>
						<Box fontSize='x20' lineHeight='2' color='info'>See all your downloads here</Box>
					</Box>
				</Grid.Item>

				<Grid.Item xl={ 12 }>
					<Tabs>
						<Tabs.Item selected={ tab === STATUS.ALL } onClick={ handleTabChange }>All Downloads</Tabs.Item>
						<Tabs.Item selected={ tab === STATUS.PAUSED } onClick={ handleTabChange }>Paused</Tabs.Item>
						<Tabs.Item selected={ tab === STATUS.CANCELLED} onClick={ handleTabChange }>Cancelled</Tabs.Item>
					</Tabs>
				</Grid.Item>

				<Grid.Item xl={ 12 } style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
					<Grid.Item xl={ 3 } sm={ 2 } >
						<SearchInput width='150px' onChange={ handleSearch } placeholder='Search' addon={ <Icon name='send' size='x20' /> } />
					</Grid.Item>

					<Grid.Item xl={ 3 } sm={ 2 } >
						<Select width='100%' onChange={ handleServerFilter } placeholder='Filter by Server' options={ options } />

					</Grid.Item>

					<Grid.Item xl={ 2 } sm={ 2 } >
						<Select width='100%' onChange={ handleMimeFilter } placeholder='Filter by File type' options={ fileTypes } />
					</Grid.Item>

					<Grid.Item xl={ 1 } sm={ 1 } >
						<Box width='100%' textAlign='end'>
							<Button ghost onClick={ handleLayout }>
								<Icon name='medium-view' size='x32' title='Change Downloads View' />
							</Button>
						</Box>

					</Grid.Item>

					<Grid.Item xl={ 1 } sm={ 1 } className='tooltip' >
						<Button ghost onClick={ clearAll }>
							<Icon name='trash' size='x32' title='Remove All' />
						</Button>
					</Grid.Item>
				</Grid.Item>

				<Grid.Item xl={ 12 } style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
					{/* Download Item List */ }
					{ filteredDownloads.map((downloadItem) => {
						// Condition for Data Headings
						if (!timeHeading) {
							timeHeading = new Date(downloadItem.itemId).toDateString();
						} else if (timeHeading === new Date(downloadItem.itemId).toDateString()) {
							return <DownloadItem { ...downloadItem } updateDownloads={ updateDownloads } key={ downloadItem.itemId } layout={ layout } handleFileOpen={ handleFileOpen } clear={ clear } />;
						}
						timeHeading = new Date(downloadItem.itemId).toDateString();
						return (
							<>
								<Box fontSize='x16' color='info' alignSelf='start'>{ timeHeading }</Box>
								<DownloadItem mb='x16' { ...downloadItem } updateDownloads={ updateDownloads } key={ downloadItem.itemId } layout={ layout } handleFileOpen={ handleFileOpen } clear={ clear } />
							</>
						);
					}) }
				</Grid.Item>

			</Grid>
		</Box>
	</Wrapper>;
}
