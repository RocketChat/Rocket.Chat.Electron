import { Box, Tile, Grid, Divider, SearchInput, Select, Icon, Button, Tabs } from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer } from 'electron';

import { Wrapper, Content } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';


function formatBytes(bytes, decimals = 2, size = false) {
	if (bytes === 0) {
		return '0 Bytes';
	}

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	if (size) {
		return `${ parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) } ${ sizes[i] }`;
	}
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
}

export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);
	console.log({ servers, currentServerUrl });


	// Downloads Array
	const [downloads, setDownloads] = useState([]);


	const [url, setUrl] = useState('');
	const [percentage, setPercentage] = useState(0);
	const [fileName, setFileName] = useState('');
	const [fileSize, setFileSize] = useState(0);
	const [totalBytes, setTotalBytes] = useState(0);
	const [serverTitle, setServerTitle] = useState('');
	// let timeDownloaded;


	useEffect(() => {
		const intializeDownloads = (event, downloads) => {
			console.log('Initialized Downloads');
			setDownloads(Object.values(downloads));
			console.log(downloads);
		};
		ipcRenderer.on('initialize-downloads', intializeDownloads);
		return () => {
			ipcRenderer.removeListener('initialize-downloads', intializeDownloads);
		};
	}, []);

	// Download Completed, Send data back
	useEffect(() => {
		const downloadComplete = () => {
			console.log('trigger');
			ipcRenderer.send('download-complete', { url, fileName, fileSize, percentage: 100, serverTitle });
		};

		ipcRenderer.on('download-complete', downloadComplete);
		return () => {
			ipcRenderer.removeListener('download-complete', downloadComplete);
		};
	}, [fileName, fileSize, serverTitle, url]);

	// Initalize  A Download
	useEffect(() => {
		const handleFileSize = (event, props) => {
			console.log('New Download');
			// console.log(props);
			setFileName(props.filename);
			setTotalBytes(props.totalBytes);
			const filesize = formatBytes(props.totalBytes, 2, true);
			setFileSize(filesize);
			setUrl(props.url);
			const index = servers.findIndex(({ webContentId }) => webContentId === props.id);
			// console.log(index);
			setServerTitle(servers[index].title);
		};

		ipcRenderer.on('download-start', handleFileSize);
		return () => {
			ipcRenderer.removeListener('download-start', handleFileSize);
		};
	}, [servers]);


	// Hanndle Progress Percentage and Update
	useEffect(() => {
		const handleProgress = (event, bytes) => {
			console.log('Progress');
			// console.log(` Current Bytes: ${ bytes }`);
			const percentage = (bytes / totalBytes) * 100;
			setPercentage(percentage);
		};

		ipcRenderer.on('downloading', handleProgress);
		return () => {
			ipcRenderer.removeListener('downloading', handleProgress);
		};
	}, [totalBytes]);

	// Creat function to create download item, fill the global state with the new item.
	// function newDownload

	// const createNewDownload = ({ url, percentage, fileSize, fileName, serverTitle }) => {
	// 	return <DownloadItem serverTitle={serverTitle} percentage={percentage} filename={fileName} filesize={fileSize} url={url} />;
	// };

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
						<Select width='300px' placeholder='Filter by Server' options={ [[1, 'Rocket.Chat'], [2, 'Server2'], [3, 'Test Server']] } />
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
						{ downloads.map((downloadItem) => <DownloadItem {...downloadItem} />)}

					</Grid.Item>

				</Grid>
			</Box>
		</Content>
	</Wrapper>;
}
