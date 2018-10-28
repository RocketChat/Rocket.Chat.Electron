import { BrowserWindow, nativeImage } from 'electron';
import jetpack from 'fs-jetpack';
import { whenReady, whenReadyToShow } from './utils';

let rendererWindow = null;

const getRendererWindow = async() => {
	if (!rendererWindow) {
		await whenReady();
		rendererWindow = new BrowserWindow({ show: false });

		const dataUrl = `data:text/html,<!doctype html>
		${ jetpack.read(`${ __dirname }/public/images/icon.svg`) }`;

		rendererWindow.loadURL(dataUrl);
		await whenReadyToShow(rendererWindow);
	}

	return rendererWindow;
};

const renderInWindow = async(style) => {
	const create = ({ template, status, badgeText } = {}) => {
		const svg = document.querySelector('#icon').cloneNode(true);

		svg.querySelector('.logo .baloon').style.fill = template ? '#FFFFFF' : '#DB2323';
		svg.querySelector('.logo .circles').style.fill = template ? '#FFFFFF' : '#DB2323';
		svg.querySelector('.status .away').style.fill = template ? '#FFFFFF' : '#DB2323';
		svg.querySelector('.status .busy').style.fill = template ? '#FFFFFF' : '#DB2323';

		svg.querySelector('.logo .bubble').style.display = template ? 'none' : null;

		svg.querySelector('.badge').style.display = (!template && badgeText) ? null : 'none';
		svg.querySelector('.badge text').innerHTML = badgeText;

		svg.querySelector('.logo .circles').style.display = (template && status !== 'online') ? 'none' : '';
		svg.querySelector('.status circle').style.display = (template || !status) ? 'none' : null;
		svg.querySelector('.status .away').style.display = (template && status === 'away') ? null : 'none';
		svg.querySelector('.status .busy').style.display = (template && status === 'busy') ? null : 'none';
		svg.querySelector('.status circle').style.fill = {
			offline: null,
			away: 'yellow',
			busy: 'red',
			online: 'lime',
		}[status];

		return svg;
	};

	const rasterize = async(svg, size) => {
		const image = new Image();
		image.src = `data:image/svg+xml,${ encodeURIComponent(svg.outerHTML) }`;
		image.width = image.height = size;
		await new Promise((resolve, reject) => {
			image.onload = resolve;
			image.onerror = reject;
		});

		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;

		const ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0);

		return canvas.toDataURL('image/png');
	};

	const svg = create(style);
	const pixelRatio = window.devicePixelRatio;
	const iconSize = (style.size || 256) * pixelRatio;
	const dataUrl = await rasterize(svg, iconSize);
	svg.remove();
	return { dataUrl, pixelRatio };
};

const render = async(style = {}) => {
	const rendererWindow = await getRendererWindow();
	const jsCode = `(${ renderInWindow.toString() })(${ JSON.stringify(style) })`;
	const { dataUrl, pixelRatio } = await rendererWindow.webContents.executeJavaScript(jsCode);
	const buffer = nativeImage.createFromDataURL(dataUrl).toPNG();
	const image = nativeImage.createFromBuffer(buffer, pixelRatio);
	image.setTemplateImage(style.template || false);
	return image;
};

export default {
	render,
};
