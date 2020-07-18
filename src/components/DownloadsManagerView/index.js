import { Box, Tile, Grid, Divider, SearchInput, Select, Icon, Button, Tabs } from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, shell } from 'electron';
import { createFilter } from 'react-search-input';

import { Wrapper, Content } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';


export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	const servers = useSelector(({ servers }) => servers);
	// const [filterValue, setFilterValue] = useState('');
	const FILENAME_FILTER = 'fileName';
	const SERVER_FILTER = 'serverTitle';
	const MIME_FILTER = 'mime';

	// Downloads Array
	const [downloads, setDownloads] = useState([]);
	const [filteredDownloads, setFilterDownloads] = useState([]);
	const [tab, setTab] = useState('All Downloads');

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


	const handleSearch = (event) => {
		console.log(Boolean(event.target.value));
		console.log(downloads);
		// setFilterValue(event.target.value);

		const filteredDownloads = event.target.value ? downloads.filter(createFilter(event.target.value, FILENAME_FILTER)) : downloads;
		console.log(filteredDownloads);
		setFilterDownloads(filteredDownloads);
	};

	const handleServerFilter = (event) => {
		console.log(Boolean(event.target.value));
		console.log(downloads);
		// setFilterValue(event.target.value);

		const filteredDownloads = event.target.value ? downloads.filter(createFilter(event.target.value, SERVER_FILTER)) : downloads;
		console.log(filteredDownloads);
		setFilterDownloads(filteredDownloads);
	};

	const handleMimeFilter = (event) => {
		console.log(Boolean(event.target.value));
		console.log(downloads);
		// setFilterValue(event.target.value);

		const filteredDownloads = event.target.value ? downloads.filter(createFilter(event.target.value, MIME_FILTER)) : downloads;
		console.log(filteredDownloads);
		setFilterDownloads(filteredDownloads);
	};

	const reset = () => {
		ipcRenderer.send('reset');
	};

	const updateDownloads = (data) => {
		console.log(data);
		const updatedDownloads = downloads.map((downloadItem) => {
			if (downloadItem.itemId === data.itemId) {
				for (const key of Object.keys(data)) {
					console.log(key);
					downloadItem[key] = data[key];
				}
				console.log(downloadItem);
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


	useEffect(() => {
		console.log(downloads);
		const filteredDownloads = tab === 'All Downloads' ? downloads : downloads.filter((download) => download.status === tab);
		setFilterDownloads(filteredDownloads);
	}, [downloads, tab]);


	return <Wrapper isVisible={ isVisible }>
		<Content>
			<Box width='85%'>

				<Grid xl={ true } >

					<Grid.Item xl={ 12 } style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }>
						<Grid.Item xl={ 3 } sm={ 2 } >
							<SearchInput width='100%' onChange={ handleSearch } placeholder='Search' addon={ <Icon name='send' size='x20' /> } />
						</Grid.Item>

						<Grid.Item xl={ 3 } sm={ 2 } >
							<Select width='100%' placeholder='Filter by Server' options={ servers.map((server, index) => [index + 1, server.title]) } />
						</Grid.Item>

						<Grid.Item xl={ 2 } sm={ 2 } >
							<Select width='100%' placeholder='Filter by File type' options={ [[1, 'audio'], [2, 'text'], [3, 'image'], [4, 'video'], [5, 'file']] } />
						</Grid.Item>

						<Grid.Item xl={ 1 } sm={ 1 } >
							<Button ghost>
								<Icon name='medium-view' size='x32' />
							</Button>
						</Grid.Item>

						<Grid.Item xl={ 1 } sm={ 1 } >
							<Button ghost onClick={reset}>
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
						{ filteredDownloads.map((downloadItem) => <DownloadItem { ...downloadItem } updateDownloads={ updateDownloads } key={ downloadItem.itemId } handleFileOpen={ handleFileOpen } handleLinks={ handleLinks } />) }
					</Grid.Item>

				</Grid>
			</Box>
		</Content>
	</Wrapper>;
}
