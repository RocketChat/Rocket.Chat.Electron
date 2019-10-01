import { app } from 'electron';
import { EventEmitter } from 'events';
import { getMainWindow } from './mainWindow';
import { getTrayIconImage, getAppIconImage } from './icon';


const getBadgeText = ({ badge }) => {
	if (badge === '•') {
		return '•';
	}

	if (Number.isInteger(badge)) {
		return String(badge);
	}

	return '';
};

let state = {
	badge: null,
	hasTrayIcon: false,
};

const instance = new (class Dock extends EventEmitter {});

const destroy = () => {
	instance.removeAllListeners();
};

const update = async (previousState) => {
	const mainWindow = await getMainWindow();

	if (process.platform === 'darwin') {
		app.dock.setBadge(getBadgeText(state));
		const count = Number.isInteger(state.badge) ? state.badge : 0;
		const previousCount = Number.isInteger(previousState.badge) ? state.badge : 0;
		if (count > 0 && previousCount === 0) {
			app.dock.bounce();
		}
	}

	if (process.platform === 'linux' || process.platform === 'win32') {
		const image = state.hasTrayIcon ? getAppIconImage() : getTrayIconImage({ badge: state.badge });
		mainWindow.setIcon(image);
	}

	if (!mainWindow.isFocused()) {
		const count = Number.isInteger(state.badge) ? state.badge : 0;
		mainWindow.flashFrame(count > 0);
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
