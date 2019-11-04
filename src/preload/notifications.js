import { EventEmitter } from 'events';

import { ipcRenderer, remote } from 'electron';
import mem from 'mem';

class Notification extends EventEmitter {
	static requestPermission() {

	}

	static get permission() {
		return 'granted';
	}

	constructor(title, options) {
		super();
		this.createIcon = mem(this.createIcon.bind(this));
		this.create({ title, ...options });
		this.addEventListener = this.addListener.bind(this);
	}

	async createIcon(icon) {
		const img = new Image();
		img.src = icon;
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});

		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;

		const context = canvas.getContext('2d');
		context.drawImage(img, 0, 0);

		return canvas.toDataURL();
	}

	async create({ icon, canReply, ...options }) {
		if (icon) {
			icon = await this.createIcon(icon);
		}

		const notification = new remote.Notification({
			icon: icon && remote.nativeImage.createFromDataURL(icon),
			hasReply: canReply,
			...options,
		});

		notification.on('show', this.handleShow.bind(this));
		notification.on('close', this.handleClose.bind(this));
		notification.on('click', this.handleClick.bind(this));
		notification.on('reply', this.handleReply.bind(this));
		notification.on('action', this.handleAction.bind(this));

		notification.show();

		this.notification = notification;
	}

	handleShow(event) {
		event.currentTarget = this;
		this.onshow && this.onshow.call(this, event);
		this.emit('show', event);
	}

	handleClose(event) {
		event.currentTarget = this;
		this.onclose && this.onclose.call(this, event);
		this.emit('close', event);
	}

	handleClick(event) {
		ipcRenderer.send('focus');
		ipcRenderer.sendToHost('focus');
		event.currentTarget = this;
		this.onclick && this.onclick.call(this, event);
		this.emit('close', event);
	}

	handleReply(event, reply) {
		event.currentTarget = this;
		event.response = reply;
		this.onreply && this.onreply.call(this, event);
		this.emit('reply', event);
	}

	handleAction(event, index) {
		event.currentTarget = this;
		event.index = index;
		this.onaction && this.onaction.call(this, event);
		this.emit('action', event);
	}

	close() {
		if (!this.notification) {
			return;
		}

		this.notification.close();
		this.notification = null;
	}
}

export default () => {
	window.Notification = Notification;
};
