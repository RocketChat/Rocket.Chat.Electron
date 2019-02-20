import { app } from 'electron';
import { EventEmitter } from 'events';
import { getMainWindow } from './mainWindow';
import { getTrayIconImage, getAppIconImage } from './icon';


const getBadgeText = ({ badge: { title, count } }) => {
	if (title === '•') {
		return '•';
	} else if (count > 0) {
		return String(count);
	}
};

let state = {
	badge: {
		title: '',
		count: 0,
	},
	hasTrayIcon: false,
};

const instance = new (class Dock extends EventEmitter {});

const destroy = () => {
	instance.removeAllListeners();
};

const update = async(previousState) => {
	const mainWindow = await getMainWindow();
	const badgeText = getBadgeText(state);

	if (process.platform === 'darwin') {
		app.dock.setBadge(badgeText || '');
		if (state.badge.count > 0 && previousState.badge.count === 0) {
			app.dock.bounce();
		}
	}

	if (process.platform === 'linux' || process.platform === 'win32') {
		const image = state.hasTrayIcon ? getAppIconImage() : getTrayIconImage(state.badge);
		mainWindow.setIcon(image);
	}

	if (!mainWindow.isFocused()) {
		mainWindow.flashFrame(state.badge.count > 0);
	}

	instance.emit('update');
};

const setState = (partialState) => {
	const previousState = state;
	state = {
		...state,
		...partialState,
	};
	update(previousState);
};

export default Object.assign(instance, {
	destroy,
	setState,
});
