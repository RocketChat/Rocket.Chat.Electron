import { Box, ButtonGroup, ProgressBar } from '@rocket.chat/fuselage';
import { useMutableCallback, useDebouncedState } from '@rocket.chat/fuselage-hooks';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, remote, clipboard } from 'electron';

import { formatBytes, STATUS, DOWNLOAD_EVENT } from './downloadUtils';
import Info from './Info';
import ActionButton from './ActionButton';

function DownloadItem({
	thumbnail,
	url,
	fileName,
	totalBytes,
	itemId,
	mime,
	updateDownloads,
	date = new Date(itemId).toDateString(),
	Mbps: mbps,
	Kbps: kbps,
	serverTitle,
	fileSize = formatBytes(totalBytes, 2, true),
	...props
}) {
	const servers = useSelector(({ servers }) => servers);

	const [percentage, setPercentage] = useDebouncedState(props.percentage || 0, 100);
	const [path, setPath] = useDebouncedState(props.path || '', 100);
	const [status, setStatus] = useDebouncedState(props.status || STATUS.ALL, 100);
	const [timeLeft, setTimeLeft] = useDebouncedState(props.timeLeft || null, 100);


	const completed = percentage === 100;
	const paused = status === STATUS.PAUSED;


	if (!serverTitle) {
		const index = servers.findIndex(({ webContentId }) => webContentId === props.serverId);
		serverTitle = servers[index].title;
	}


	const handleProgress = useMutableCallback((event, data) => {
		const percentage = Math.floor((data.bytes / totalBytes) * 100);
		updateDownloads({ itemId, status: STATUS.ALL, percentage, serverTitle, Mbps: data.Mbps, Kbps: data.Kbps, fileName: data.fileName });
		setStatus(STATUS.ALL);
		setPercentage(percentage);
		setTimeLeft(data.timeLeft);
	});

	useEffect(() => {
		// Listen on unique event only
		ipcRenderer.on(DOWNLOAD_EVENT.DOWNLOADING_ID.concat(itemId), handleProgress);
		return () => {
			ipcRenderer.removeListener(DOWNLOAD_EVENT.DOWNLOADING_ID.concat(itemId), handleProgress);
		};
	}, [handleProgress, itemId]);


	// Download Completed, Send data back
	useEffect(() => {
		const downloadComplete = (event, data) => {
			setStatus(STATUS.ALL);
			setPath(data.path);
			setTimeLeft(null);
			updateDownloads({ status: STATUS.ALL, serverTitle, itemId, percentage: 100, thumbnail: data.thumbnail, path: data.path });
			ipcRenderer.send(DOWNLOAD_EVENT.COMPLETE, { status: STATUS.ALL, url, fileName, fileSize, percentage: 100, serverTitle, itemId, date, path: data.path, mime, thumbnail: data.thumbnail });
		};

		ipcRenderer.on(DOWNLOAD_EVENT.COMPLETE_ID.concat(itemId), downloadComplete);
		return () => {
			ipcRenderer.removeListener(DOWNLOAD_EVENT.COMPLETE_ID.concat(itemId), downloadComplete);
		};
	}, [date, fileName, fileSize, itemId, mime, props, serverTitle, setPath, setPercentage, setStatus, setTimeLeft, updateDownloads, url]);

	const handleCancel = useMutableCallback(() => {
		setStatus(STATUS.CANCELLED);
		setTimeLeft(null);
		ipcRenderer.send(DOWNLOAD_EVENT.CANCEL_ID.concat(itemId));
		updateDownloads({ status: STATUS.CANCELLED, percentage, itemId });
		ipcRenderer.send(DOWNLOAD_EVENT.COMPLETE, { status: STATUS.CANCELLED, url, fileName, fileSize, percentage, serverTitle, itemId, date, path, mime });
	});

	const handlePause = useMutableCallback(() => {
		setStatus(STATUS.PAUSED);
		ipcRenderer.send(DOWNLOAD_EVENT.PAUSE_ID.concat(itemId));
		updateDownloads({ status: STATUS.PAUSED, percentage, itemId });
	});

	const handleDelete = useMutableCallback((isRetry) => props.clear(itemId, isRetry));

	const handleRetry = useMutableCallback(() => {
		// Adding ServerTitle to Download URL for use in retrying the cancelled download
		remote.getCurrentWebContents().downloadURL(`${ url }#${ serverTitle }`);
		handleDelete(true);
	});

	const handleFileOpen = useMutableCallback(() => props.handleFileOpen(path));

	// TODO TOAST
	const handleCopyLink = useMutableCallback(() => clipboard.write({ text: url }));

	const speed = mbps > 0.1 ? `${ mbps }Mbps` : `${ kbps }Kbps`;
	const isCompleted = completed;
	const isCancelled = status === STATUS.CANCELLED;
	const isPaused = paused;

	return <Box width='100%' height='x44' mbe='x26' display='flex' alignItems='center' mb={props.mb}>
		<Box width='x188' flexShrink={ 0 } borderRadius='4px' display='flex' flexDirection='row' alignItems='center' justifyContent='center'>
			<Box display='flex' flexDirection='column' width='x36' height='x44'>
				<Box is='img' src='images/file-icon.svg' alt={name} width='x36' />
				<Box fontSize='x12' fontWeight='600' textAlign='center' mbs='-20px' color='neutral-600' display='block'>{ mime.split('/')[1] }</Box>
			</Box>
			<Box width='x144' mis='x8'>
				<Box fontSize='x14' withTruncatedText color={ isCancelled ? 'danger-500' : 'default' } mbe='x4'>{ fileName }</Box>
				<Info>{ serverTitle }</Info>
			</Box>
		</Box>

		<Box display='flex' flexDirection='column' flexGrow={ 1 } mi='x16'>
			<Box display='flex' flexDirection='row' mbe='x6' alignItems='center' justifyContent='space-between'>
				<Box display='flex' flexDirection='row' alignItems='center'>
					<Info mie='x12'>{percentage}% of { fileSize }</Info>
					{ isCompleted || isCancelled || <Info mie='x12'>{ speed }</Info> }
					{ timeLeft && <Info>{ timeLeft }s left</Info> }
				</Box>
				<ButtonGroup fontSize='x12' withTruncatedText color='neutral-700' >
					{/* Completed */ }
					{ isCompleted && !isCancelled && <ActionButton onClick={ handleFileOpen }>Show in Folder</ActionButton> }
					{ isCompleted && !isCancelled && <ActionButton onClick={ handleCopyLink }>Copy Link</ActionButton> }
					{/* Progressing and Paused */ }
					{ !isCompleted && !isCancelled && <ActionButton onClick={ handlePause }>{ isPaused ? 'Resume' : 'Pause' }</ActionButton> }
					{ !isCompleted && !isCancelled && <ActionButton onClick={ handleCancel }>Cancel</ActionButton> }
					{/* Cancelled */ }
					{ isCancelled && <ActionButton onClick={ handleRetry }>Retry</ActionButton> }
					<ActionButton isRemove onClick={ () => handleDelete(false) }>Remove from List</ActionButton>
				</ButtonGroup>
			</Box>
			<Box mbe='x8'>
				<ProgressBar percentage={ percentage } error = { isCancelled ? 'Download Cancelled' : undefined } />
			</Box>
		</Box>
	</Box>;
}

export default DownloadItem;
