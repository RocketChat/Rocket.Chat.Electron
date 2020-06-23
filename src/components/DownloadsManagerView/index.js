import { Box, Tile, Grid, Divider, SearchInput, Select, Icon } from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { remote, ipcRenderer } from 'electron';

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
	const [url, setUrl] = useState('');
	const [percentage, setPercentage] = useState(0);
	const [filename, setFileName] = useState('');
	const [filesize, setFileSize] = useState(0);
	const [totalBytes, setTotalBytes] = useState(0);
	let timeDownloaded;
	useEffect(() => {
		const handleFileSize = (event, props) => {
			console.log('hello yes changed');
			console.log(props);
			setFileName(props.filename);
			setTotalBytes(props.totalBytes);
			const filesize = formatBytes(props.totalBytes, 2, true);
			setFileSize(filesize);
			setUrl(props.url);
		};

		ipcRenderer.on('download-start', handleFileSize);
		return () => {
			ipcRenderer.removeListener('download-start', handleFileSize);
		};
	}, []);

	useEffect(() => {
		const handleProgress = (event, bytes) => {
			console.log('progress');
			console.log(` Current Bytes: ${ bytes }`);
			console.log(formatBytes(bytes, 2, true));
			// console.log(` Total Filesize: ${ filesize } `);
			const percentage = (bytes / totalBytes) * 100;
			setPercentage(percentage);
			if (percentage === 100) {
				const downloadTime = new Date().toLocaleTimeString();
				timeDownloaded = downloadTime;
			}
		};

		ipcRenderer.on('downloading', handleProgress);
		return () => {
			ipcRenderer.removeListener('downloading', handleProgress);
		};
	}, [totalBytes]);

	// Creat function to create download item, fill the global state with the new item.
	// function newDownload

	// Save and load downloadItem information

	return <Wrapper isVisible={ isVisible }>
		<Content>
			<Grid xl={ true } style={ { display: 'flex', justifyContent: 'center' } }>
				<Grid.Item xl={ 4 } >
					<SearchInput width='400px' placeholder='Search Downloads' addon={ <Icon name='send' size='x20' /> } />
				</Grid.Item>
				<Grid.Item xl={ 1 } >
				</Grid.Item>
				<Grid.Item xl={ 3 } >
					<Select width='250px' placeholder='Filter Server' options={ [[1, 'Rocket.Chat'], [2, 'Server2'], [3, 'Test Server']] } />
				</Grid.Item>
				<Grid.Item xl={ 1 } >
					<Icon name='medium-vew' size='x32' />
				</Grid.Item>
				<Grid.Item xl={ 1 } >
					<Icon name='kebab' size='x32' />
				</Grid.Item>

				<Box width='70%' display='flex' flexDirection='row'>
					<Grid.Item xl={ 8 }>
						<Box>
							<h1>Downloads</h1>
							<h3>See all your downloads here</h3>
						</Box>
					</Grid.Item>
					<Grid.Item xl={ 4 }>
					</Grid.Item>
				</Box>

				<Grid.Item xl={ 9 } width='75%'>
					<Divider />
				</Grid.Item>
				<Grid.Item xl={ 12 } style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
					<DownloadItem filesize={ filesize } filename={ filename } url={ url } percentage={ percentage } timeDownloaded={ timeDownloaded } />
				</Grid.Item>

			</Grid>
		</Content>
	</Wrapper>;
}
