import { remote } from 'electron';
import jetpack from 'fs-jetpack';

const { app, screen } = remote;

let saveTimeout;
let windowState;
let defaultWidth;
let defaultHeight;

const isInsideSomeScreen = () => screen.getAllDisplays()
	.some(({ bounds }) =>
		windowState.x >= bounds.x
			&& windowState.y >= bounds.y
			&& windowState.x + windowState.width <= bounds.x + bounds.width
			&& windowState.y + windowState.height <= bounds.y + bounds.height,
	);

const saveWindowState = async () => {
	clearTimeout(saveTimeout);
	saveTimeout = null;

	try {
		const userDataDir = jetpack.cwd(app.getPath('userData'));
		await userDataDir.writeAsync('window-state-main.json', windowState, {
			atomic: true,
		});
	} catch (error) {
		console.error('Failed to save window state');
		console.error(error);
	}
};

const fetchWindowState = async () => {
	const mainWindow = remote.getCurrentWindow();

	if (mainWindow.isDestroyed()) {
		return;
	}

	windowState.isMaximized = mainWindow.isMaximized();
	windowState.isMinimized = mainWindow.isMinimized();
	windowState.isHidden = !mainWindow.isMinimized() && !mainWindow.isVisible();

	if (!windowState.isMaximized && !windowState.isHidden) {
		[windowState.x, windowState.y] = mainWindow.getPosition();
		[windowState.width, windowState.height] = mainWindow.getSize();
	}
};

const applyWindowState = async () => {
	const mainWindow = remote.getCurrentWindow();

	if (!isInsideSomeScreen()) {
		const { bounds } = screen.getPrimaryDisplay();
		windowState.x = (bounds.width - defaultWidth) / 2;
		windowState.y = (bounds.height - defaultHeight) / 2;
		windowState.width = defaultWidth;
		windowState.height = defaultHeight;
	}

	if (windowState.x !== undefined && windowState.y !== undefined) {
		mainWindow.setPosition(Math.floor(windowState.x), Math.floor(windowState.y), false);
	}

	if (windowState.width !== undefined && windowState.height !== undefined) {
		mainWindow.setSize(Math.floor(windowState.width), Math.floor(windowState.height), false);
	}

	if (windowState.isMaximized) {
		mainWindow.maximize();
	} else if (windowState.isMinimized) {
		mainWindow.minimize();
	} else {
		mainWindow.restore();
	}

	if (windowState.isHidden) {
		mainWindow.hide();
	} else if (!windowState.isMinimized) {
		mainWindow.show();
	}
};

const fetchAndSave = () => {
	fetchWindowState();
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => saveWindowState(), 5000);
};

const exitFullscreen = () => new Promise((resolve) => {
	const mainWindow = remote.getCurrentWindow();

	if (mainWindow.isFullScreen()) {
		mainWindow.once('leave-full-screen', resolve);
		mainWindow.setFullScreen(false);
		return;
	}
	resolve();
});

const close = () => {
	const mainWindow = remote.getCurrentWindow();

	mainWindow.blur();

	if (process.platform === 'darwin' || windowState.hideOnClose) {
		mainWindow.hide();
	} else if (process.platform === 'win32') {
		mainWindow.minimize();
	} else {
		app.quit();
	}
};

const handleBeforeAppQuit = () => {
	const mainWindow = remote.getCurrentWindow();

	saveWindowState();
	remote.app.removeListener('before-quit', handleBeforeAppQuit);
	mainWindow.destroy();
};

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

	[defaultWidth, defaultHeight] = mainWindow.getSize();

	windowState = {
		width: defaultWidth,
		height: defaultHeight,
	};

	try {
		const userDataDir = jetpack.cwd(app.getPath('userData'));
		windowState = {
			...windowState,
			...await userDataDir.readAsync('window-state-main.json', 'json') || {},
		};
	} catch (error) {
		console.error('Failed to load window state');
		console.error(error);
	}

	applyWindowState();

	remote.app.on('before-quit', handleBeforeAppQuit);

	const handleResize = fetchAndSave;
	const handleMove = fetchAndSave;
	const handleShow = fetchAndSave;
	const handleClose = async () => {
		await exitFullscreen();
		close();
		fetchAndSave();
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
