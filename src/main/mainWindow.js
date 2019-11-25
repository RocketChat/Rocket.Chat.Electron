import { app, BrowserWindow, screen } from 'electron';
import jetpack from 'fs-jetpack';

class WindowStateHandler {
	constructor(window) {
		this.window = window;
		[this.defaultWidth, this.defaultHeight] = window.getSize();

		this.state = {
			width: this.defaultWidth,
			height: this.defaultHeight,
		};
	}

	async load() {
		try {
			const userDataDir = jetpack.cwd(app.getPath('userData'));
			this.state = {
				...this.state,
				...await userDataDir.readAsync('window-state-main.json', 'json') || {},
			};
		} catch (error) {
			console.error('Failed to load window state');
			console.error(error);
		}
	}

	async save() {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}

		try {
			const userDataDir = jetpack.cwd(app.getPath('userData'));
			await userDataDir.writeAsync('window-state-main.json', this.state, {
				atomic: true,
			});
		} catch (error) {
			console.error('Failed to save window state');
			console.error(error);
		}
	}

	async fetch() {
		const { state, window } = this;

		if (window.isDestroyed()) {
			return;
		}

		state.isMaximized = window.isMaximized();
		state.isMinimized = window.isMinimized();
		state.isHidden = !window.isMinimized() && !window.isVisible();

		if (!state.isMaximized && !state.isHidden) {
			[state.x, state.y] = window.getPosition();
			[state.width, state.height] = window.getSize();
		}
	}

	async apply() {
		const { defaultWidth, defaultHeight, state, window } = this;

		if (!this.isInsideSomeScreen()) {
			const { bounds } = screen.getPrimaryDisplay();
			state.x = (bounds.width - defaultWidth) / 2;
			state.y = (bounds.height - defaultHeight) / 2;
			state.width = defaultWidth;
			state.height = defaultHeight;
		}

		if (state.x !== undefined && state.y !== undefined) {
			window.setPosition(Math.floor(state.x), Math.floor(state.y), false);
		}

		if (state.width !== undefined && state.height !== undefined) {
			window.setSize(Math.floor(state.width), Math.floor(state.height), false);
		}

		if (state.isMaximized) {
			window.maximize();
		} else if (state.isMinimized) {
			window.minimize();
		} else {
			window.restore();
		}

		if (state.isHidden) {
			window.hide();
		} else if (!state.isMinimized) {
			window.show();
		}
	}

	isInsideSomeScreen() {
		const { state } = this;

		return screen.getAllDisplays()
			.some(({ bounds }) =>
				state.x >= bounds.x
				&& state.y >= bounds.y
				&& state.x + state.width <= bounds.x + bounds.width
				&& state.y + state.height <= bounds.y + bounds.height,
			);
	}

	fetchAndSave() {
		this.fetch();
		clearTimeout(this.saveTimeout);
		this.saveTimeout = setTimeout(() => this.save(), 5000);
	}
}

let mainWindow = null;

let state = {
	hideOnClose: false,
};

const setState = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

async function attachWindowStateHandling(mainWindow) {
	const windowStateHandler = new WindowStateHandler(mainWindow);
	await windowStateHandler.load();
	await new Promise((resolve) => mainWindow.once('ready-to-show', resolve));
	windowStateHandler.apply();

	const exitFullscreen = () => new Promise((resolve) => {
		if (mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', resolve);
			mainWindow.setFullScreen(false);
			return;
		}
		resolve();
	});

	const close = () => {
		mainWindow.blur();

		if (process.platform === 'darwin' || state.hideOnClose) {
			mainWindow.hide();
		} else if (process.platform === 'win32') {
			mainWindow.minimize();
		} else {
			app.quit();
		}
	};

	app.on('activate', () => mainWindow && mainWindow.show());
	app.on('before-quit', () => {
		mainWindow = null;
		windowStateHandler.save();
	});

	mainWindow.on('resize', () => windowStateHandler.fetchAndSave());
	mainWindow.on('move', () => windowStateHandler.fetchAndSave());
	mainWindow.on('show', () => windowStateHandler.fetchAndSave());
	mainWindow.on('close', async (event) => {
		if (!mainWindow) {
			return;
		}

		event.preventDefault();
		await exitFullscreen();
		close();
		windowStateHandler.fetchAndSave();
	});

	mainWindow.on('set-state', setState);
}

export async function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		minWidth: 600,
		minHeight: 400,
		titleBarStyle: 'hidden',
		show: false,
		webPreferences: {
			webviewTag: true,
			nodeIntegration: true,
		},
	});
	attachWindowStateHandling(mainWindow);

	mainWindow.webContents.on('will-attach-webview', (event, webPreferences) => {
		delete webPreferences.enableBlinkFeatures;
	});

	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);

	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}
}
