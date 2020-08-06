import { performElectronStartup } from './app';
import { setUserDataDirectory } from './dev';
import { attachErrorHandlers } from './errors';

export const performStartup = () => {
	setUserDataDirectory();
	attachErrorHandlers();
	performElectronStartup();
};
