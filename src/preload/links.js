import { shell, remote } from 'electron';

import { getSettings } from './rocketChat';


const handleAnchorClick = (event) => {
	const a = event.target.closest('a');

	if (!a) {
		return;
	}

	const href = a.getAttribute('href');
	const download = a.hasAttribute('download');

	const canDownload = /^\/file-upload\//.test(href) || download;
	if (canDownload) {
		const downloadUrl = a.href;
		remote.getCurrentWebContents().downloadURL(downloadUrl);
		event.preventDefault();
		return;
	}

	const isLocalFilePath = /^file:\/\/.+/.test(href);
	if (isLocalFilePath) {
		const filePath = href.slice(6);
		shell.showItemInFolder(filePath);
		event.preventDefault();
		return;
	}

	const settings = getSettings();
	const isInsideDomain = settings && RegExp(`^${ settings.get('Site_Url') }`).test(href);
	const isRelative = !/^([a-z]+:)?\/\//.test(href);
	if (isInsideDomain || isRelative) {
		return;
	}

	shell.openExternal(href);
	event.preventDefault();
};


export default () => {
	window.addEventListener('load', () => {
		document.addEventListener('click', handleAnchorClick, true);
	});
};
