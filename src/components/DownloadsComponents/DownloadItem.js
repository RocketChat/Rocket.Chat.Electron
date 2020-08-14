import { useMutableCallback, useDebouncedState } from '@rocket.chat/fuselage-hooks';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, remote, clipboard } from 'electron';

import { formatBytes, STATUS } from '../DownloadsManagerView/downloadUtils';
import Extended from './Extended';
import Compact from './Compact';


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
	const [status, setStatus] = useDebouncedState(props.status || STATUS.ALL, 100);
	const [thumb, setThumb] = useState();

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
		updateDownloads({ status: STATUS.ALL, percentage, serverTitle, itemId, Mbps: data.Mbps, path: data.savePath });
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
		const downloadComplete = (event, data) => {
			console.log('Download Complete');
			console.log(data);
			setStatus(STATUS.ALL);
			setThumb(data.thumb);
			updateDownloads({ status: STATUS.ALL, serverTitle, itemId, percentage: 100 });
			ipcRenderer.send('download-complete', { status: STATUS.ALL, url, fileName, fileSize, percentage: 100, serverTitle, itemId, date, path: data.path, mime, thumb: data.thumb });
		};

		ipcRenderer.on(`download-complete-${ itemId }`, downloadComplete);
		return () => {
			ipcRenderer.removeListener(`download-complete-${ itemId }`, downloadComplete);
		};
	}, [date, fileName, fileSize, itemId, mime, props, serverTitle, setStatus, updateDownloads, url]);

	const handleCancel = useMutableCallback(() => {
		setStatus(STATUS.CANCELLED);
		ipcRenderer.send(`cancel-${ itemId }`);
		updateDownloads({ status: STATUS.CANCELLED, percentage, itemId });
		ipcRenderer.send('download-complete', { status: STATUS.CANCELLED, url, fileName, fileSize, percentage, serverTitle, itemId, date, path, mime });
	});

	const handlePause = useMutableCallback(() => {
		console.log(percentage);
		setStatus(STATUS.PAUSED);
		ipcRenderer.send(`pause-${ itemId }`);
		updateDownloads({ status: STATUS.PAUSED, percentage, itemId });
	});


	const handleDelete = useMutableCallback(() => props.clear(itemId));

	const handleRetry = useMutableCallback(() => {
		// Adding ServerTitle to Download URL for use in retrying the cancelled download
		remote.getCurrentWebContents().downloadURL(`${ url }#${ serverTitle }`);
		handleDelete();
	});

	const handleFileOpen = useMutableCallback(() => props.handleFileOpen(path));

	// TODO TOAST
	const handleCopyLink = useMutableCallback(() => clipboard.write({ text: url }));

	const printState = () => console.log({ path, thumb });

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
		thumbnail={thumb}
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
		handleCopyLink={printState}
		handlePause={handlePause}
		handleCancel={handleCancel}
		handleRetry={handleRetry}
		handleDelete={handleDelete}
		mb = {props.mb}
	/>;
}
