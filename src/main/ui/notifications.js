import { ipcMain, Notification, webContents, nativeImage } from 'electron';
import fetch from 'node-fetch';
import { call } from 'redux-saga/effects';

export function *setupNotifications() {
	yield call(() => {
		const notifications = new Map();

		const iconCache = new Map();

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

		const resolveIcon = async (iconUrl) => {
			if (!iconUrl) {
				return null;
			}

			if (/^data:/.test(iconUrl)) {
				return nativeImage.createFromDataURL(iconUrl);
			}

			if (iconCache.has(iconUrl)) {
				return iconCache.get(iconUrl);
			}

			try {
				const response = await fetch(iconUrl);
				const buffer = await response.buffer();
				const base64String = buffer.toString('base64');
				const contentType = inferContentTypeFromImageData(buffer) || response.headers.get('content-type');
				const dataUri = `data:${ contentType };base64,${ base64String }`;
				const image = nativeImage.createFromDataURL(dataUri);
				iconCache.set(iconUrl, image);
				return image;
			} catch (error) {
				console.error(error);
				return null;
			}
		};

		ipcMain.handle('notification/create', async (event, {
			title,
			icon,
			...options
		}) => {
			const id = Math.random().toString(36).slice(2);

			const notification = new Notification({
				title,
				icon: await resolveIcon(icon),
				...options,
			});

			notification.addListener('show', () => {
				webContents.getAllWebContents().forEach((webContents) => {
					webContents.send('notification/shown', id);
				});
			});

			notification.addListener('close', () => {
				webContents.getAllWebContents().forEach((webContents) => {
					webContents.send('notification/closed', id);
					notifications.delete(id);
				});
			});

			notification.addListener('click', () => {
				webContents.getAllWebContents().forEach((webContents) => {
					webContents.send('notification/clicked', id);
				});
			});

			notification.addListener('reply', (event, reply) => {
				webContents.getAllWebContents().forEach((webContents) => {
					webContents.send('notification/replied', id, reply);
				});
			});

			notification.addListener('action', (event, index) => {
				webContents.getAllWebContents().forEach((webContents) => {
					webContents.send('notification/actioned', id, index);
				});
			});

			notifications.set(id, notification);

			return id;
		});

		ipcMain.handle('notification/show', (event, id) => {
			notifications.get(id)?.show();
		});

		ipcMain.handle('notification/close', (event, id) => {
			notifications.get(id)?.close();
		});
	});
}
