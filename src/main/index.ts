import { performElectronStartup } from './app';
import { setUserDataDirectory } from './dev';
import { attachErrorHandlers } from './errors';
import { createReduxStore } from './reduxStore';

export const performStartup = (): void => {
	setUserDataDirectory();
	attachErrorHandlers();
	performElectronStartup();
	createReduxStore();
};
