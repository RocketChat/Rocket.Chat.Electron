import { Box, Margins, Tile, Grid, Icon, Button } from '@rocket.chat/fuselage';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer } from 'electron';
import { Progress } from 'react-sweet-progress';
import 'react-sweet-progress/lib/style.css';

// Utility function for bytes conversion. TODO: seperate into another file.
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


// Recieve props for individual download item
export default function DownloadItem(props) {
	// console.log(props);
	const servers = useSelector(({ servers }) => servers);
	// console.log(servers);

	const { url } = props;
	const { fileName } = props;
	const { totalBytes } = props;
	const { itemId } = props;
	const { serverId } = props;
	const date = props.date || new Date(itemId).toDateString();
	const fileSize = props.fileSize || formatBytes(props.totalBytes, 2, true);
	const [percentage, setPercentage] = useState(props.percentage);
	const [path, setPath] = useState(props.path);
	const [status, setStatus] = useState('Complete');

	let serverTitle;

	if (serverId) {
		const index = servers.findIndex(({ webContentId }) => webContentId === props.serverId);
		serverTitle = servers[index].title;
	} else {
		serverTitle = props.serverTitle;
	}


	// Download Completed, Send data back
	useEffect(() => {
		const downloadComplete = () => {
			console.log('Download Complete');
			ipcRenderer.send('download-complete', { status, url, fileName, fileSize, percentage: 100, serverTitle, itemId, date, path });
		};

		ipcRenderer.on(`download-complete-${ itemId }`, downloadComplete);
		return () => {
			ipcRenderer.removeListener(`download-complete-${ itemId }`, downloadComplete);
		};
	});


	// TODO: Convert to only recieve dynamic progressed bytes data.
	useEffect(() => {
		const handleProgress = (event, props) => {
			console.log('Progress');
			// console.log(` Current Bytes: ${ bytes }`);
			const percentage = (props.bytes / totalBytes) * 100;
			setPercentage(Math.floor(percentage));
			setPath(props.savePath);
			setStatus('Progressing');
			// console.log(props);
		};
		// Listen on unique event only
		ipcRenderer.on(`downloading-${ itemId }`, handleProgress);
		return () => {
			ipcRenderer.removeListener(`downloading-${ itemId }`, handleProgress);
		};
	}, [itemId, totalBytes]);


	const handleCancel = () => {
		setStatus('Cancelled');
		ipcRenderer.send(`cancel-${ itemId }`);
		ipcRenderer.send('download-complete', { status, url, fileName, fileSize, percentage, serverTitle, itemId, date, path });
	};
	const handlePause = () => {
		setStatus('Paused');
		ipcRenderer.send(`pause-${ itemId }`);
	};

	return <Margins all='x32'>

		{/* <Grid md={true}> */ }
		<Tile elevation='2' style={ { width: '95%' } }>
			<Box height='11.5rem' width='100%' display='flex' alignItems='center'>
				<Grid.Item xl={ 2 } sm={ 2 } style={ { display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
					<Box height='150px' width='150px' backgroundColor='lightgrey' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
						<Icon size='7rem' name='clip' />
						<Box fonScale='s2' color='primary-500' display='block'>.mp3</Box>
					</Box>
				</Grid.Item>
				<Grid.Item xl={ 9 } sm={ 5 } style={ { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-around', padding: '1.2rem 0' } }>
					<Box fontSize='h1' lineHeight='h1'>{ fileName }</Box>
					<Box display='flex' flexDirection='row' justifyContent='space-between' width='100%'>
						<Box fontSize='s2' color='info'>{ serverTitle || '@Server' }</Box> <Box fontSize='s2' color='info'> { date }</Box> <Box fontSize='s2' color='info'>{ fileSize || '25MB' }</Box>
						<Box fontSize='s2' color='info'>{ '87KB/s' }</Box>
						<Box fontSize='s2' color='info'>{ '60s Left' }</Box>
					</Box>
					<Progress theme={ { default: { color: '#2F80ED' } } } percent={ percentage } status='default' />
					<Box fontSize='s2' >{ (url && url.substring(0, 45)) }</Box>
					{/* // TODO: Implement Show in Folder */ }
					<Box display='flex' flexDirection='row' justifyContent='space-between'>
						<Box is={ Button } ghost onClick={ () => props.handleFileOpen(path) } style={ { textDecoration: 'none', color: '#2F80ED' } }>Show in Folder</Box>
						<Box is={ Button } display={ false ? 'none' : 'inline' } ghost onClick={ () => handlePause() } style={ { textDecoration: 'none', color: '#2F80ED' } }>Pause</Box>
						<Box is={ Button } ghost onClick={ () => handleCancel() } style={ { textDecoration: 'none', color: '#2F80ED' } }>Cancel</Box>
					</Box>
				</Grid.Item>
				<Grid.Item xl={ 1 } sm={ 1 } style={ { display: 'flex', justifyContent: 'center' } }>
					<Icon name='cross' size='x32' />
				</Grid.Item>
			</Box>
		</Tile>
		{/* </Grid> */ }
	</Margins>;
}
