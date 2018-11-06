const { ipcRenderer, nativeImage } = require('electron');
const { EventEmitter } = require('events');
const jetpack = require('fs-jetpack');
const tmp = require('tmp');

class Notification extends EventEmitter {
	static requestPermission() {
		return;
	}

	static get permission() {
		return 'granted';
	}

	constructor(title, options) {
		super();

		this.create({ title, ...options });
	}

	async create({ icon, ...options }) {
		if (icon) {
			Notification.cachedIcons = Notification.cachedIcons || {};

			if (!Notification.cachedIcons[icon]) {
				Notification.cachedIcons[icon] = await new Promise((resolve, reject) =>
					tmp.file((err, path) => (err ? reject(err) : resolve(path))));
				const buffer = nativeImage.createFromDataURL(icon).toPNG();
				await jetpack.writeAsync(Notification.cachedIcons[icon], buffer);
			}
			icon = Notification.cachedIcons[icon];
		}

		this.id = ipcRenderer.sendSync('request-notification', { icon, ...options });

		ipcRenderer.on('notification-clicked', (event, id) => {
			if (id !== this.id) {
				return;
			}

			ipcRenderer.send('focus');
			ipcRenderer.sendToHost('focus');
			typeof this.onclick === 'function' && this.onclick.call(this);
			this.emit('click');
		});
		ipcRenderer.on('notification-closed', (event, id) => id === this.id && this.emit('close'));
	}

	close() {
		ipcRenderer.send('close-notification', this.id);
	}
}

module.exports = Notification;
