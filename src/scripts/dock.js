import { EventEmitter } from 'events';

import { remote } from 'electron';

import { getAppIconPath, getTrayIconPath } from './icon';

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

const instance = new class Dock extends EventEmitter {}();

const destroy = () => {
	instance.removeAllListeners();
};

const update = async (previousState) => {
	if (process.platform === 'darwin') {
		remote.app.dock.setBadge(getBadgeText(state));
		const count = Number.isInteger(state.badge) ? state.badge : 0;
		const previousCount = Number.isInteger(previousState.badge) ? state.badge : 0;
		if (count > 0 && previousCount === 0) {
			remote.app.dock.bounce();
		}
	}

	if (process.platform === 'linux' || process.platform === 'win32') {
		const image = state.hasTrayIcon ? getAppIconPath() : getTrayIconPath({ badge: state.badge });
		remote.getCurrentWindow().setIcon(image);
	}

	if (process.platform === 'win32' && !remote.getCurrentWindow().isFocused()) {
		const count = Number.isInteger(state.badge) ? state.badge : 0;
		remote.getCurrentWindow().flashFrame(count > 0);
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
