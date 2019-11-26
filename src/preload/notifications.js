import { EventEmitter } from 'events';

import { ipcRenderer, remote } from 'electron';

const fetchWithoutOrigin = remote.require('electron-fetch').default;

const avatarCache = {};

const inferContentTypeFromImageData = (data) => {
	const header = data.slice(0, 3).map((byte) => byte.toString(16)).join('');
	switch (header) {
		case '89504e':
			return 'image/png';
		case '474946':
			return 'image/gif';
		case 'ffd8ff':
			return 'image/jpeg';
	}
};

const getAvatarUrlAsDataUrl = async (avatarUrl) => {
	if (/^data:/.test(avatarUrl)) {
		return avatarUrl;
	}

	if (avatarCache[avatarUrl]) {
		return avatarCache[avatarUrl];
	}

	const response = await fetchWithoutOrigin(avatarUrl);
	const arrayBuffer = await response.arrayBuffer();
	const byteArray = Array.from(new Uint8Array(arrayBuffer));
	const binaryString = byteArray.reduce((binaryString, byte) => binaryString + String.fromCharCode(byte), '');
	const base64String = btoa(binaryString);
	const contentType = response.headers.get('content-type');
	avatarCache[avatarUrl] = `data:${ inferContentTypeFromImageData(byteArray) || contentType };base64,${ base64String }`;
	return avatarCache[avatarUrl];
};


class Notification extends EventEmitter {
	static requestPermission() {

	}

	static get permission() {
		return 'granted';
	}

	constructor(title, options) {
		super();
		this.create({ title, ...options });
	}

	addEventListener = ::this.addListener

	async create({ icon, canReply, ...options }) {
		if (icon) {
			icon = await getAvatarUrlAsDataUrl(icon);
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
		ipcRenderer.send('main-window/focus');
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
