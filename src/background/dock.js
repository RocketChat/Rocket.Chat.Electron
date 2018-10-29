import { app } from 'electron';
import { EventEmitter } from 'events';
import { getMainWindow } from './mainWindow';
import icon from './icon';


const getBadgeText = ({ badge: { title, count, showAlert } }) => {
	if (process.platform !== 'darwin') {
		if (title === '•') {
			return '•';
		} else if (count > 0) {
			return count > 9 ? '9+' : String(count);
		} else if (showAlert) {
			return '!';
		}
	}
};

let state = {
	badge: {
		title: '',
		count: 0,
		showAlert: false,
	},
	status: 'online',
};

const instance = new (class Dock extends EventEmitter {});

const destroy = () => {
	instance.removeAllListeners();
};

const update = async() => {
	const mainWindow = await getMainWindow();
	const badgeText = getBadgeText(state);

	if (process.platform === 'win32') {
		const image = badgeText ? await icon.render({
			overlay: true,
			size: 16,
			badgeText,
		}) : null;
		mainWindow.setOverlayIcon(image, badgeText || '');

		mainWindow.removeListener('show', update);
		mainWindow.on('show', update);
	}

	if (process.platform === 'darwin') {
		app.dock.setBadge(badgeText);
	}

	if (process.platform === 'linux') {
		mainWindow.setIcon(await icon.render({ size: [16, 32, 48, 64, 128] }));
	}

	if (!mainWindow.isFocused()) {
		mainWindow.flashFrame(state.badge.count > 0);
	}

	instance.emit('update');
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
	update();
};

export default Object.assign(instance, {
	destroy,
	setState,
});
