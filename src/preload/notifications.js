import { ipcRenderer, nativeImage } from 'electron';
import { EventEmitter } from 'events';
import jetpack from 'fs-jetpack';
import tmp from 'tmp';


const instances = new Map();

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
		instances.set(this.id, this);
	}

	close() {
		ipcRenderer.send('close-notification', this.id);
	}
}

const handleNotificationShown = (event, id) => {
	const notification = instances.get(id);
	if (!notification) {
		return;
	}

	typeof notification.onshow === 'function' && notification.onshow.call(notification);
	notification.emit('show');
};

const handleNotificationClicked = (event, id) => {
	const notification = instances.get(id);
	if (!notification) {
		return;
	}

	ipcRenderer.send('focus');
	ipcRenderer.sendToHost('focus');

	typeof notification.onclick === 'function' && notification.onclick.call(notification);
	notification.emit('click');
};

const handleNotificationClosed = (event, id) => {
	const notification = instances.get(id);
	if (!notification) {
		return;
	}

	typeof notification.onclose === 'function' && notification.onclose.call(notification);
	notification.emit('close');
};


export default () => {
	window.Notification = Notification;
	ipcRenderer.on('notification-shown', handleNotificationShown);
	ipcRenderer.on('notification-clicked', handleNotificationClicked);
	ipcRenderer.on('notification-closed', handleNotificationClosed);
};
