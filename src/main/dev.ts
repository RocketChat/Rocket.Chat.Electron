export const setupElectronReloader = async (): Promise<void> => {
	const { default: setupElectronReloader } = await import('electron-reloader');
	setupElectronReloader(require.main);
};

export const installDevTools = async (): Promise<void> => {
	const {
		default: installExtension,
		REACT_DEVELOPER_TOOLS,
		REDUX_DEVTOOLS,
	} = await import('electron-devtools-installer');
	await installExtension(REACT_DEVELOPER_TOOLS);
	await installExtension(REDUX_DEVTOOLS);
};
