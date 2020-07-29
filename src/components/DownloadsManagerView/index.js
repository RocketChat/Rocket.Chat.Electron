import { Box, Grid, SearchInput, Select, Icon, Button, Tabs } from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, shell } from 'electron';

import { Wrapper, Content } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';


const mapping = {
	application: 'Files',
	image: 'Images',
	video: 'Videos',
	audio: 'Audios',
};

export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	const options = [[1, 'All'], [2, 'Rocket.Chat'], [3, 'Rocket.Chat2']];
	const fileTypes = [[1, 'All'], [2, 'Images'], [3, 'Videos'], [4, 'Audios'], [5, 'Texts'], [6, 'Files']];
	// const mimeTypes = []
	// Downloads Array
	const [downloads, setDownloads] = useState([]);
	const [tab, setTab] = useState('All Downloads');
	const [searchVal, setSearchVal] = useState('');
	const [serverVal, setServerVal] = useState('');
	const [typeVal, setTypeVal] = useState('');
	const [layout, setLayout] = useState('expanded');
	let timeHeading;

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
	const handleLayout = () => {
		if (layout === 'compact') {
			setLayout('expanded');
		} else {
			setLayout('compact');
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
		return downloads.filter((download) => (!searchRegex || searchRegex.test(download.fileName)) && (!tab || download.status === tab) && (!serverVal || serverVal === download.serverTitle) && (!typeVal || mapping[download.mime.split('/')[0]] === typeVal)).sort((a, b) => b.itemId - a.itemId);
	}, [searchVal, downloads, tab, serverVal, typeVal]);


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
							<Select width='100%' onChange={ handleMimeFilter } placeholder='Filter by File type' options={ fileTypes } />
						</Grid.Item>

						<Grid.Item xl={ 1 } sm={ 1 } >
							<Button ghost onClick={ handleLayout }>
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
						{filteredDownloads.map((downloadItem) => {
							if (!timeHeading) {
								timeHeading = new Date(downloadItem.itemId).toDateString();
							} else if (timeHeading === new Date(downloadItem.itemId).toDateString()) {
								return <DownloadItem { ...downloadItem } updateDownloads={ updateDownloads } key={ downloadItem.itemId } layout={layout} handleFileOpen={ handleFileOpen } handleLinks={ handleLinks } clear= { clear } />;
							}
							timeHeading = new Date(downloadItem.itemId).toDateString();
							return (
								<>
									<Box fontSize='x16' lineHeight='2' color='info' alignSelf='start' paddingInlineStart='x20'>{timeHeading}</Box>
									<DownloadItem { ...downloadItem } updateDownloads={ updateDownloads } key={ downloadItem.itemId } layout={layout} handleFileOpen={ handleFileOpen } handleLinks={ handleLinks } clear= { clear } />
								</>
							);
						}) }
					</Grid.Item>

				</Grid>
			</Box>
		</Content>
	</Wrapper>;
}
