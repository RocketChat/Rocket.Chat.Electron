import { useMutableCallback, useDebouncedState } from '@rocket.chat/fuselage-hooks';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, remote, clipboard } from 'electron';

import { formatBytes, STATUS, DOWNLOAD_EVENT } from '../DownloadsManagerView/downloadUtils';
import Extended from './Extended';
import Compact from './Compact';


// Recieve props for individual download item
export default function DownloadItem({
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
			updateDownloads({ status: STATUS.ALL, serverTitle, itemId, percentage: 100, thumbnail: data.thumbnail });
			ipcRenderer.send(DOWNLOAD_EVENT.COMPLETE, { status: STATUS.ALL, url, fileName, fileSize, percentage: 100, serverTitle, itemId, date, path: data.path, mime, thumbnail: data.thumbnail });
		};

		ipcRenderer.on(DOWNLOAD_EVENT.COMPLETE_ID.concat(itemId), downloadComplete);
		return () => {
			ipcRenderer.removeListener(DOWNLOAD_EVENT.COMPLETE_ID.concat(itemId), downloadComplete);
		};
	}, [date, fileName, fileSize, itemId, mime, props, serverTitle, setPath, setStatus, updateDownloads, url]);

	const handleCancel = useMutableCallback(() => {
		setStatus(STATUS.CANCELLED);
		ipcRenderer.send(DOWNLOAD_EVENT.CANCEL_ID.concat(itemId));
		updateDownloads({ status: STATUS.CANCELLED, percentage, itemId });
		ipcRenderer.send(DOWNLOAD_EVENT.COMPLETE.concat(itemId), { status: STATUS.CANCELLED, url, fileName, fileSize, percentage, serverTitle, itemId, date, path, mime });
	});

	const handlePause = useMutableCallback(() => {
		console.log(percentage);
		setStatus(STATUS.PAUSED);
		ipcRenderer.send(DOWNLOAD_EVENT.PAUSE_ID.concat(itemId));
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


	return props.layout === 'compact' ? <Compact
		serverTitle={serverTitle}
		mime={ mime.split('/')[1] }
		date={date}
		status={status}
		fileName={fileName}
		fileSize={fileSize}
		mbps={mbps}
		kbps= {kbps}
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
		thumbnail={thumbnail}
		serverTitle={serverTitle}
		mime={ mime.split('/')[1] }
		date={date}
		status={status}
		fileName={fileName}
		fileSize={fileSize}
		mbps={mbps}
		kbps= {kbps}
		timeLeft={timeLeft}
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
