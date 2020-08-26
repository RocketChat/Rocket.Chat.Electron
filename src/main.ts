import { performElectronStartup } from './main/app';
import { setUserDataDirectory } from './main/dev';
import { attachErrorHandlers } from './main/errors';
import { createReduxStore } from './main/reduxStore';

if (require.main === module) {
  setUserDataDirectory();
  attachErrorHandlers();
  performElectronStartup();
  createReduxStore();
}
