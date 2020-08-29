import { Box, Tile, Grid, Divider, SearchInput, Select, Icon, Button, Tabs } from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, shell } from 'electron';

import { Wrapper, Content } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';


export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	const servers = useSelector(({ servers }) => servers);

	// const servers = useSelector(({ servers }) => servers);
	// console.log({ servers });

	const handleLinks = (e) => {
		e.preventDefault();
		shell.openExternal(e.target.href);
	};

	const handleFileOpen = (e, path) => {
		console.log(e);
		shell.showItemInFolder(path);
	};

	// Downloads Array
	const [downloads, setDownloads] = useState([]);


	useEffect(() => {
		const createDownload = (event, props) => {
			console.log('Creating New Download');
			const updatedDownloads = [...downloads];
			updatedDownloads.push([props.itemId, props]);
			setDownloads(updatedDownloads);
			console.log(props.itemId);
		};
		ipcRenderer.on('create-download-item', createDownload);
		return () => {
			ipcRenderer.removeListener('create-download-item', createDownload);
		};
	}, [downloads]);

	useEffect(() => {
		const intializeDownloads = (event, downloads) => {
			const updatedDownloads = Object.entries(downloads).map(([key, value]) => [key, value]);
			setDownloads(updatedDownloads);
			console.log(downloads);
		};
		ipcRenderer.on('initialize-downloads', intializeDownloads);
		return () => {
			ipcRenderer.removeListener('initialize-downloads', intializeDownloads);
		};
	}, []);

	const updateDownloads = (itemId, downloadItem) => {
		const updatedDownloads = [...downloads];
		updatedDownloads.push([itemId, downloadItem]);
		setDownloads(updatedDownloads);
	};


	useEffect(() => {
		console.log('Loading Downloads');
		ipcRenderer.send('load-downloads');
	}, []);

	return <Wrapper isVisible={ isVisible }>
		<Content>
			<Box width='85%'>

				<Grid xl={ true }>

					<Grid.Item xl={ 6 } >
						<SearchInput placeholder='Search Downloads' width='500px' addon={ <Icon name='send' size='x20' /> } />
					</Grid.Item>

					<Grid.Item xl={ 4 } >
						<Select width='300px' placeholder='Filter by Server' options={ servers.map((server, index) => [index + 1, server.title]) } />
					</Grid.Item>

					<Grid.Item xl={ 1 } >
						<Button ghost>
							<Icon name='medium-view' size='x32' />
						</Button>
					</Grid.Item>

					<Grid.Item xl={ 1 } >
						<Button ghost>
							<Icon name='kebab' size='x32' />
						</Button>
					</Grid.Item>

					<Grid.Item xl={ 10 }>
						<Box>
							<Box fontSize='x32' lineHeight='2'>Downloads</Box>
							<Box fontSize='x20' lineHeight='2' color='info'>See all your downloads here</Box>
						</Box>
					</Grid.Item>

					<Grid.Item xl={ 12 }>
						<Tabs>
							<Tabs.Item selected>Downloads</Tabs.Item>
							<Tabs.Item>Paused</Tabs.Item>
							<Tabs.Item>Cancelled</Tabs.Item>
						</Tabs>
					</Grid.Item>

					<Grid.Item xl={ 12 } style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
						{/* Download Item List */}
						{ downloads.map(([itemId, downloadItem]) => <DownloadItem itemId={itemId} {...downloadItem} updateDownloads = {updateDownloads} key={itemId} handleFileOpen={handleFileOpen} handleLinks={handleLinks} />)}
					</Grid.Item>

				</Grid>
			</Box>
		</Content>
	</Wrapper>;
}
