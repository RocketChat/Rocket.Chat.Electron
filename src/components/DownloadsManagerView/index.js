import { Box, Tile, Grid, Divider, SearchInput, Select, Icon, Button, Tabs } from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, shell } from 'electron';
import { createFilter } from 'react-search-input';

import { Wrapper, Content } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';


export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	const options = [[1, 'All'], [2, 'Rocket.Chat'], [3, 'Rocket.Chat2']];
	// const mimeTypes = []
	// Downloads Array
	const [downloads, setDownloads] = useState([]);
	const [tab, setTab] = useState('All Downloads');
	const [searchVal, setSearchVal] = useState('');
	const [serverVal, setServerVal] = useState('');

	const handleLinks = (e) => {
		e.preventDefault();
		shell.openExternal(e.target.href);
	};

	const handleFileOpen = (path) => {
		console.log(path);
		shell.showItemInFolder(path);
	};

	const handleTabChange = (event) => {
		// console.log(event.target.innerText);
		if (tab !== event.target.innerText) {
			setTab(event.target.innerText);
		}
	};

	const clear = (itemId) => {
		const newDownloads = downloads.filter((download) => download.itemId !== itemId);
		setDownloads(newDownloads);
	};
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

	const handleMimeFilter = (event) => {
		console.log(Boolean(event.target.value));
		console.log(downloads);
		// setFilterValue(event.target.value);

		const filteredDownloads = event.target.value ? downloads.filter(createFilter(event.target.value, MIME_FILTER)) : downloads;
		console.log(filteredDownloads);
		setFilterDownloads(filteredDownloads);
	};


	const updateDownloads = (data) => {
		console.log(data);
		const updatedDownloads = downloads.map((downloadItem) => {
			if (downloadItem.itemId === data.itemId) {
				for (const key of Object.keys(data)) {
					// console.log(key);
					downloadItem[key] = data[key];
				}
				// console.log(downloadItem);
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
			const updatedDownloads = [...downloads];
			updatedDownloads.push(props);
			setDownloads(updatedDownloads);
			console.log(props.itemId);
		};
		ipcRenderer.on('create-download-item', createDownload);
		return () => {
			ipcRenderer.removeListener('create-download-item', createDownload);
		};
	}, [downloads]);


	// useEffect(() => {
	// 	console.log(downloads);
	// 	let filteredDownloads;
	// 	if (prevValues.prevTab !== tab) {
	// 		filteredDownloads = tab === 'All Downloads' ? downloads : downloads.filter((download) => download.status === tab);
	// 	}
	// 	if (prevValues.prevSearchVal !== searchVal) {
	// 		filteredDownloads = searchVal ? filteredDownloads.filter(createFilter(searchVal, FILENAME_FILTER)) : filteredDownloads;
	// 	}
	// 	setFilterDownloads(filteredDownloads);
	// }, [downloads, tab, searchVal, prevValues.prevTab, prevValues.prevSearchVal]);

	const filteredDownloads = useMemo(() => {
		const searchRegex = searchVal && new RegExp(`${ searchVal }`, 'gi');
		return downloads.filter((download) => (!searchRegex || searchRegex.test(download.fileName)) && (!tab || download.status === tab) && (!serverVal || serverVal === download.serverTitle)).sort((a, b) => b.itemId - a.itemId);
	}, [downloads, searchVal, tab, serverVal]);


	return <Wrapper isVisible={ isVisible }>
		<Content>
			<Box width='85%'>

				<Grid xl={ true } >

					<Grid.Item xl={ 12 } style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
						<Grid.Item xl={ 3 } sm={ 2 } >
							<SearchInput width='100%' onChange={ handleSearch } placeholder='Search' addon={ <Icon name='send' size='x20' /> } />
						</Grid.Item>

						<Grid.Item xl={ 3 } sm={ 2 } >
							{/* <Select width='100%' onChange={ handleServerFilter } placeholder='Filter by Server' options={ servers.map((server, index) => [index + 1, server.title]) } /> */}
							<Select width='100%' onChange={ handleServerFilter } placeholder='Filter by Server' options={ options } />

						</Grid.Item>

						<Grid.Item xl={ 2 } sm={ 2 } >
							<Select width='100%' placeholder='Filter by File type' options={ [[1, 'Images'], [2, 'Videos'], [3, 'Audios'], [4, 'Texts'], [5, 'Files']] } />
						</Grid.Item>

						<Grid.Item xl={ 1 } sm={ 1 } >
							<Button ghost>
								<Icon name='medium-view' size='x32' />
							</Button>
						</Grid.Item>

						<Grid.Item xl={ 1 } sm={ 1 } >
							<Button ghost onClick={ clearAll }>
								<Icon name='kebab' size='x32' />
							</Button>
						</Grid.Item>
					</Grid.Item>
					<Grid.Item xl={ 10 }>
						<Box>
							<Box fontSize='x32' lineHeight='2'>Downloads</Box>
							<Box fontSize='x20' lineHeight='2' color='info'>See all your downloads here</Box>
						</Box>
					</Grid.Item>

					<Grid.Item xl={ 12 }>
						<Tabs>
							<Tabs.Item selected={ tab === 'All Downloads' } onClick={ handleTabChange }>All Downloads</Tabs.Item>
							<Tabs.Item selected={ tab === 'Paused' } onClick={ handleTabChange }>Paused</Tabs.Item>
							<Tabs.Item selected={ tab === 'Cancelled' } onClick={ handleTabChange }>Cancelled</Tabs.Item>
						</Tabs>
					</Grid.Item>

					<Grid.Item xl={ 12 } style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
						{/* Download Item List */ }
						{ filteredDownloads.map((downloadItem) => <DownloadItem { ...downloadItem } updateDownloads={ updateDownloads } key={ downloadItem.itemId } handleFileOpen={ handleFileOpen } handleLinks={ handleLinks } clear= { clear } />) }
					</Grid.Item>

				</Grid>
			</Box>
		</Content>
	</Wrapper>;
}
