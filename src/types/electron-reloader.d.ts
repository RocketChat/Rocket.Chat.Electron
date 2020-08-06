declare module 'electron-reloader' {
	function setupElectronReloader(module: NodeJS.Module): void;

	export = setupElectronReloader;
}
