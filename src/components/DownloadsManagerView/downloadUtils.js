// Utility function for bytes conversion. TODO: seperate into another file.
export function formatBytes(bytes, decimals = 2, size = false) {
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

//  Filetype to Mimetype mapping
export const mapping = {
	application: 'Files',
	image: 'Images',
	video: 'Videos',
	audio: 'Audios',
	text: 'Texts',
};

export const DOWNLOAD_EVENT = {
	PAUSE_ID: 'pause-',
	CANCEL_ID: 'cancel-',
	COMPLETE: 'download-complete',
	COMPLETE_ID: 'download-complete-',
	DOWNLOADING_ID: 'downloading-',
	LOAD: 'load-downloads',
	INITIALIZE: 'initialize-downloads',
	CREATE: 'create-download-item',
};

export const STATUS = {
	CANCELLED: 'Cancelled',
	PAUSED: 'Paused',
	ALL: 'All',
};
