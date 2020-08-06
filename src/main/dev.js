export const setupElectronReloader = async () => {
	const { default: setupElectronReloader } = await import('electron-reloader');
	setupElectronReloader(require.main);
};

export const installDevTools = async () => {
	const {
		default: installExtension,
		REACT_DEVELOPER_TOOLS,
		REDUX_DEVTOOLS,
	} = await import('electron-devtools-installer');
	await installExtension(REACT_DEVELOPER_TOOLS);
	await installExtension(REDUX_DEVTOOLS);
};
