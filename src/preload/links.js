import { shell } from 'electron';
const { BrowserWindow } = require('electron').remote;
const PDFWindow = require('electron-pdf-window');


const handleAnchorClick = (event) => {
	const a = event.target.closest('a');

	if (!a) {
		return;
	}

	const href = a.getAttribute('href');
	const download = a.hasAttribute('download');

	const isPdfFile = RegExp(/.*\.pdf$/).test(href) && !download;
	if (isPdfFile) {
		const absPathToPdf = `${ window.location.protocol }//${ window.location.hostname }${ href }`;
		const pdfWindow = new BrowserWindow({ width: 800, height: 600, });
		PDFWindow.addSupport(pdfWindow);
		pdfWindow.loadURL(absPathToPdf);
		event.stopPropagation();
		return;
	}

	const isFileUpload = /^\/file-upload\//.test(href) && !download;
	if (isFileUpload) {
		const clone = a.cloneNode();
		clone.setAttribute('download', 'download');
		clone.click();
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

	const { Meteor } = window;
	const isInsideDomain = Meteor && RegExp(`^${ Meteor.absoluteUrl() }`).test(href);
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
