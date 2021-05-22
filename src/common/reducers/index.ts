import { combineReducers } from 'redux';

import { appReducer } from './appReducer';
import { downloadsReducer } from './downloadsReducer';
import {
  clientCertificates,
  externalProtocols,
  trustedCertificates,
} from './navigationReducers';
import { serversReducer } from './serversReducer';
import { uiReducer } from './uiReducer';
import { updatesReducer } from './updatesReducer';

export const rootReducer = combineReducers({
  app: appReducer,
  downloads: downloadsReducer,
  servers: serversReducer,
  updates: updatesReducer,
  ui: uiReducer,
  clientCertificates,
  externalProtocols,
  trustedCertificates,
});
