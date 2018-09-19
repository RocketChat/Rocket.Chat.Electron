const { ipcRenderer, remote } = require('electron');

if (process.platform === 'darwin') {
	const NodeNotification = require('node-mac-notifier');
	window.Notification = class Notification extends NodeNotification {
		constructor(title, options) {
			options.bundleId = 'chat.rocket';
			super(title, options);
			this.addEventListener('click', (/* notification*/) => this.onclick());
		}

		static requestPermission() {
			return;
		}

		static get permission() {
			return 'granted';
		}
	};
}

class Notification extends window.Notification {
	constructor(title, options) {
		super(title, options);
		ipcRenderer.send('notification-shim', title, options);

		// Handle correct notification using unique tag
		ipcRenderer.once(`clicked-${ options.tag }`, () => this.onclick());
	}


	get onclick() {
		return super.onclick;
	}

	/*
    set onclick (fn) {
        const result = super.onclick = () => {
            ipcRenderer.send('focus');
            ipcRenderer.sendToHost('focus');
            fn.apply(this, arguments);
        };
        return result;
    }
    */

	set onclick(fn) {
		const result = super.onclick = (...args) => {
			const currentWindow = remote.getCurrentWindow();
			if (process.platform === 'win32') {
				if (currentWindow.isVisible()) {
					currentWindow.focus();
				} else if (currentWindow.isMinimized()) {
					currentWindow.restore();
				} else {
					currentWindow.show();
				}
			} else if (currentWindow.isMinimized()) {
				currentWindow.restore();
			} else {
				currentWindow.show();
			}

			ipcRenderer.sendToHost('focus');
			fn.apply(this, args);
		};
		return result;
	}
}

module.exports = Notification;
