import { Box, Grid, Icon, Button, ButtonGroup } from '@rocket.chat/fuselage';
import { useMutableCallback, useDebouncedState } from '@rocket.chat/fuselage-hooks';
import React, { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, remote, clipboard } from 'electron';
import { Progress as SweetProgress } from 'react-sweet-progress';

import 'react-sweet-progress/lib/style.css';
import { formatBytes } from '../../downloadUtils';


const STATUS = {
	CANCELLED: 'cancelled',
	PAUSED: 'paused',
};

// Recieve props for individual download item
export default function DownloadItem({
	url,
	fileName,
	totalBytes,
	itemId,
	mime,
	updateDownloads,
	date = new Date(itemId).toDateString(),
	Mbps: mbps,
	serverTitle,
	fileSize = formatBytes(totalBytes, 2, true),
	...props
}) {
	// console.log(props);
	const servers = useSelector(({ servers }) => servers);

	const [percentage, setPercentage] = useDebouncedState(props.percentage || 0, 100);
	const [path, setPath] = useDebouncedState(props.path || '', 100);
	const [status, setStatus] = useDebouncedState(props.status || 'All Downloads', 100);

	const completed = percentage === 100;
	const paused = status === STATUS.PAUSED;


	if (!serverTitle) {
		const index = servers.findIndex(({ webContentId }) => webContentId === props.serverId);
		serverTitle = servers[index].title;
	}


	const handleProgress = useMutableCallback((event, data) => {
		console.log('Progress');
		// console.log(` Current Bytes: ${ bytes }`);
		const percentage = Math.floor((data.bytes / totalBytes) * 100);
		updateDownloads({ status: 'All Downloads', percentage, serverTitle, itemId, Mbps: data.Mbps });
		setPercentage(percentage);
		setPath(data.savePath);
	});

	// TODO: Convert to only recieve dynamic progressed bytes data. NEED TO THROTTLE
	useEffect(() => {
		// Listen on unique event only
		ipcRenderer.on(`downloading-${ itemId }`, handleProgress);
		return () => {
			ipcRenderer.removeListener(`downloading-${ itemId }`, handleProgress);
		};
	}, [handleProgress, itemId]);


	// Download Completed, Send data back
	useEffect(() => {
		const downloadComplete = (data) => {
			console.log('Download Complete');
			setStatus('All Downloads');
			props.updateDownloads({ status: 'All Downloads', serverTitle, itemId, percentage: 100 });
			ipcRenderer.send('download-complete', { status: 'All Downloads', url, fileName, fileSize, percentage: 100, serverTitle, itemId, date, path: data.path, mime });
		};

		ipcRenderer.on(`download-complete-${ itemId }`, downloadComplete);
		return () => {
			ipcRenderer.removeListener(`download-complete-${ itemId }`, downloadComplete);
		};
	}, [date, fileName, fileSize, itemId, mime, props, serverTitle, setStatus, url]);

	const handleCancel = useMutableCallback(() => {
		setStatus(STATUS.CANCELLED);
		ipcRenderer.send(`cancel-${ itemId }`);
		props.updateDownloads({ status: STATUS.CANCELLED, percentage, itemId });
		ipcRenderer.send('download-complete', { status: STATUS.CANCELLED, url, fileName, fileSize, percentage, serverTitle, itemId, date, path, mime });
	});

	const handlePause = useMutableCallback(() => {
		console.log(percentage);
		setStatus(STATUS.PAUSED);
		ipcRenderer.send(`pause-${ itemId }`);
		props.updateDownloads({ status: STATUS.PAUSED, percentage, itemId });
	});

	const handleRetry = useMutableCallback(() => {
		remote.getCurrentWebContents().downloadURL(`${ url }#${ serverTitle }`);
		props.clear(itemId);
	});

	const handleDelete = useMutableCallback(() => props.clear(itemId));

	const handleFileOpen = useMutableCallback(() => props.handleFileOpen(path));

	// TODO TOAST
	const handleCopyLink = useMutableCallback(() => clipboard.write({ text: url }));

	return props.layout === 'compact' ? <Compact
		serverTitle={serverTitle}
		mime={ mime.split('/')[1] }
		date={date}
		fileName={fileName}
		fileSize={fileSize}
		mbps={mbps}
		percentage={percentage}
		isCompleted={completed}
		isPaused={paused}
		isCancelled={status === STATUS.CANCELLED}
		handleFileOpen={handleFileOpen}
		handleCopyLink={handleCopyLink}
		handlePause={handlePause}
		handleCancel={handleCancel}
		handleRetry={handleRetry}
		handleDelete={handleDelete}
		mb = {props.mb}/> : <Extended
		serverTitle={serverTitle}
		mime={ mime.split('/')[1] }
		date={date}
		fileName={fileName}
		fileSize={fileSize}
		mbps={mbps}
		percentage={percentage}
		isCompleted={completed}
		isPaused={paused}
		isCancelled={status === STATUS.CANCELLED}
		handleFileOpen={handleFileOpen}
		handleCopyLink={handleCopyLink}
		handlePause={handlePause}
		handleCancel={handleCancel}
		handleRetry={handleRetry}
		handleDelete={handleDelete}
		mb = {props.mb}
	/>;
}

const Compact = React.memo(({
	serverTitle,
	mime,
	date,
	fileName,
	fileSize,
	mbps,
	percentage,
	isCompleted,
	isPaused,
	isCancelled,
	handleFileOpen,
	handleCopyLink,
	handlePause,
	handleCancel,
	handleRetry,
	handleDelete,
	...props
}) => <Box width='100%' display='flex' justifyContent='center' flexDirection='column' alignItems='center' {...props}>
	<Box display='flex' flexGrow={1} width='100%'>
		<Box fontScale='p1' withTruncatedText flexGrow={1}>{ fileName }</Box>
		<Box display='flex' justifyContent='space-between' alignItems='center'>
			{/* <img src={ image } height='30px' width='30px' style={ { borderRadius: '5px' } } alt="" /> */ }
			{/* TODO INSERT TITLES FOR EACH ACTION */}
			{/* Completed */ }
			{ isCompleted && <ActionButton onClick={ handleFileOpen } title='open in folder'><Icon name='chevron-up'/></ActionButton>}
			{/* Progressing and Paused */ }
			{ !isCompleted && !isCancelled && <ActionButton onClick={ handlePause } title={isPaused ? 'resume' : 'pause'}>{ isPaused ? <Icon name='play'/> : <Icon name='pause'/> }</ActionButton> }
			{ !isCompleted && !isCancelled && <ActionButton onClick={ handleCancel } title='remove'><Icon name='cross'/></ActionButton> }
			{/* Cancelled */ }
			{ isCancelled && <ActionButton onClick={ handleRetry } title='Retry'><Icon name='refresh'/></ActionButton>}
		</Box>
	</Box>
	<Box display='flex' flexGrow={1} width='100%'>
		<Info withTruncatedText>{ serverTitle }</Info>
		<Info withTruncatedText mi='x8'>{ fileSize }</Info>
		{ mbps && <Info mi='x8'>{`${ mbps }Mbps/s`}</Info> }
		<Progress percent={ percentage } mi='x8'/>
		<Info withTruncatedText mi='x8'>{ date }</Info>
		{/* <Box display='flex' alignItems='center'>
			<Icon name='kebab'/> */}
		{/* </Box> */}
	</Box>
</Box>);

const Extended = React.memo(({
	serverTitle,
	mime,
	date,
	fileName,
	fileSize,
	mbps,
	percentage,
	isCompleted,
	isPaused,
	isCancelled,
	handleFileOpen,
	handleCopyLink,
	handlePause,
	handleCancel,
	handleRetry,
	handleDelete,
	...props
}) => <Box width='100%' display='flex' alignItems='center' {...props}>
	{/* USE AVATAR FUSELAGE (TODO) */ }
	<Box size='x124' flexShrink={0} bg='neutral-500-50' borderRadius='4px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
		<Icon size='x60' name='clip' />
		<Box fonScale='s2' color='primary-500' display='block'>{ mime }</Box>
	</Box>
	<Box display='flex' flexDirection='column' flexGrow={1} mi='x16'>
		<Box fontSize='s2' withTruncatedText color='default' pbe='x8'>{ fileName }</Box>
		<Box display='flex' flexDirection='row' justifyContent='space-between' mb='x8'>
			<Info>{ serverTitle }</Info>
			<Info> { date }</Info>
			<Info>{ fileSize || '25MB' }</Info>
			{ mbps > 0 && <Info>{ `${ mbps }Mbps/s` }</Info>}
			{/* ESTIMATED (TODO) */ }
			{/* <Box fontSize='s2' color='info'>{ '60s Left' }</Box> */ }
		</Box>
		<Box mb='x8'>
			<Progress percent={ percentage } />
		</Box>
		{/* // TODO: Implement Show in Folder */ }
		<ButtonGroup>
			{/* Completed */ }
			{ isCompleted && <ActionButton onClick={ handleFileOpen }>Show in Folder</ActionButton> }
			{ isCompleted && <ActionButton onClick={ handleCopyLink }>Copy Link</ActionButton> }
			{/* Progressing and Paused */ }
			{ !isCompleted && !isCancelled && <ActionButton onClick={ handlePause }>{ isPaused ? 'Resume' : 'Pause' }</ActionButton>}
			{ !isCompleted && !isCancelled && <ActionButton onClick={ handleCancel }>Cancel</ActionButton>}
			{/* Cancelled */ }
			{ isCancelled && <ActionButton onClick={ handleRetry }>Retry</ActionButton>}
			<ActionButton onClick={ handleDelete }>Delete</ActionButton>
		</ButtonGroup>
	</Box>
</Box>);

const Info = (props) => <Box fontSize='s1' color='info' {...props}/>;

const ActionButton = (props) => <Button color='primary-500' small ghost {...props}/>;

const Progress = ({ percent, ...props }) => <Box flexGrow={1} {...props}><SweetProgress theme={ useMemo(() => ({ default: { color: '#2F80ED' } }), []) } percent={ percent } status='default' /> </Box>;
