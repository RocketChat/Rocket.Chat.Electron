import { remote } from 'electron';
import jetpack from 'fs-jetpack';

const { app, screen } = remote;

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
		clearTimeout(this.saveTimeout);
		this.saveTimeout = null;

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

let state = {
	hideOnClose: false,
};

export const updateMainWindow = (partialState) => {
	state = {
		...state,
		...partialState,
	};
};

export async function mountMainWindow() {
	const mainWindow = remote.getCurrentWindow();
	const windowStateHandler = new WindowStateHandler(mainWindow);
	await windowStateHandler.load();
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

	const handleBeforeAppQuit = () => {
		windowStateHandler.save();
		remote.app.removeListener('before-quit', handleBeforeAppQuit);
		mainWindow.destroy();
	};

	remote.app.on('before-quit', handleBeforeAppQuit);

	const handleResize = ::windowStateHandler.fetchAndSave;
	const handleMove = ::windowStateHandler.fetchAndSave;
	const handleShow = ::windowStateHandler.fetchAndSave;
	const handleClose = async () => {
		await exitFullscreen();
		close();
		windowStateHandler.fetchAndSave();
	};

	mainWindow.on('resize', handleResize);
	mainWindow.on('move', handleMove);
	mainWindow.on('show', handleShow);
	mainWindow.on('close', handleClose);

	window.addEventListener('unload', () => {
		mainWindow.removeListener('resize', handleResize);
		mainWindow.removeListener('move', handleMove);
		mainWindow.removeListener('show', handleShow);
		mainWindow.removeListener('close', handleClose);
	});

	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}
}
