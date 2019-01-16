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

	const isPdfFile = /.*\.pdf$/.test(href);
	if (isPdfFile) {
		// todo need to prevent the download file window from appearing
		event.preventDefault();
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

const wrapWindowOpenPdf = (defaultWindowOpen) => (href, frameName, features) => {
	const { RocketChat } = window;

	if (RocketChat && RegExp(/.*\.pdf$/).test(href)) {
		const pdfWindow = new BrowserWindow({ width: 800, height: 600 });
		PDFWindow.addSupport(pdfWindow);
		pdfWindow.loadURL(href);
	}

	return defaultWindowOpen(href, frameName, features);
};


export default () => {
	window.addEventListener('load', () => {
		document.addEventListener('click', handleAnchorClick, true);
	});

	window.open = wrapWindowOpenPdf(window.open);
};
