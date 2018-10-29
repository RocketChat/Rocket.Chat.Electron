import { app } from 'electron';
import { EventEmitter } from 'events';
import { getMainWindow } from './mainWindow';
import icon from './icon';


const getBadgeText = ({ badge: { title, count } }) => {
	if (title === '•') {
		return '•';
	} else if (count > 0) {
		return count > 9 ? '9+' : String(count);
	} else if (title) {
		return '!';
	}
};

let state = {
	badge: {
		title: '',
		count: 0,
	},
	status: 'online',
};

const instance = new (class Dock extends EventEmitter {});

const destroy = () => {
	instance.removeAllListeners();
};

const update = async(previousState) => {
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
		app.dock.setBadge(badgeText || '');
		if (state.badge.count > 0 && previousState.badge.count === 0) {
			app.dock.bounce();
		}
	}

	if (process.platform === 'linux') {
		mainWindow.setIcon(await icon.render({
			badgeText,
			size: {
				win32: [256, 128, 64, 48, 32, 24, 16],
				linux: 128,
			}[process.platform],
		}));
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
