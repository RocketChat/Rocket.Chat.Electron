declare module 'electron-reloader' {
  function setupElectronReloader(module: NodeJS.Module, options?: Record<string, unknown>): void;

  export = setupElectronReloader;
}
