import { BrowserWindow, nativeImage } from 'electron';
import jetpack from 'fs-jetpack';
import { whenReadyToShow } from './utils';

let rendererWindow = null;

const getRendererWindow = async() => {
	if (!rendererWindow) {
		rendererWindow = new BrowserWindow({ show: false });

		const dataURL = `data:text/html,<!doctype html>
		${ jetpack.read(`${ __dirname }/public/images/icon.svg`) }`;

		rendererWindow.loadURL(dataURL);
		await whenReadyToShow(rendererWindow);
	}

	return rendererWindow;
};

/* istanbul ignore next */
const renderInWindow = async(style) => {
	const statusColors = {
		offline: null,
		away: 'yellow',
		busy: 'red',
		online: 'lime',
	};

	const create = ({ overlay, template, status, badgeText } = {}) => {
		const svg = document.querySelector('#icon').cloneNode(true);

		svg.querySelector('.logo .baloon').style.fill = template ? '#FFFFFF' : '#DB2323';
		svg.querySelector('.logo .circles').style.fill = template ? '#FFFFFF' : '#DB2323';
		svg.querySelector('.status .away').style.fill = template ? '#FFFFFF' : '#DB2323';
		svg.querySelector('.status .busy').style.fill = template ? '#FFFFFF' : '#DB2323';

		svg.querySelector('.logo .bubble').style.display = template ? 'none' : null;

		svg.querySelector('.badge').style.display = (!template && badgeText) ? null : 'none';
		svg.querySelector('.badge text').innerHTML = badgeText;

		svg.querySelector('.logo .circles').style.display = (template && status && status !== 'online') ? 'none' : '';
		svg.querySelector('.status circle').style.display = (template || !status) ? 'none' : null;
		svg.querySelector('.status .away').style.display = (template && status === 'away') ? null : 'none';
		svg.querySelector('.status .busy').style.display = (template && status === 'busy') ? null : 'none';
		svg.querySelector('.status circle').style.fill = statusColors[status];

		if (overlay) {
			const overlaySVG = svg.cloneNode(true);
			svg.remove();

			overlaySVG.querySelector('.logo').remove();
			overlaySVG.querySelector('.status').remove();
			overlaySVG.setAttribute('viewBox', '96 -32 160 160');

			return overlaySVG;
		}

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
	const sizes = Array.isArray(style.size) ? style.size : [style.size || 256];
	const images = await Promise.all(sizes.map(async(size) => ({
		dataURL: await rasterize(svg, size * pixelRatio),
		size,
		pixelRatio,
	})));
	svg.remove();
	return images;
};

const render = async(style = {}) => {
	const encodedArgs = JSON.stringify(style);
	render.cache = render.cache || [];

	if (render.cache[encodedArgs]) {
		return render.cache[encodedArgs];
	}

	const rendererWindow = await getRendererWindow();
	const jsCode = `(${ renderInWindow.toString() })(${ encodedArgs })`;
	const images = await rendererWindow.webContents.executeJavaScript(jsCode);
	const image = nativeImage.createEmpty();
	for (const { dataURL, size, pixelRatio } of images) {
		image.addRepresentation({
			scaleFactor: pixelRatio,
			width: size,
			height: size,
			dataURL,
		});
	}
	image.setTemplateImage(style.template || false);
	render.cache[encodedArgs] = image;

	return image;
};

export default {
	render,
};
