import { performElectronStartup } from './main/app';
import { setUserDataDirectory } from './main/dev';
import { attachErrorHandlers } from './main/errors';
import { rootSaga } from './main/rootSaga';
import { createMainReduxStore } from './store';

if (require.main === module) {
  setUserDataDirectory();
  attachErrorHandlers();
  performElectronStartup();
  createMainReduxStore(rootSaga);
}
