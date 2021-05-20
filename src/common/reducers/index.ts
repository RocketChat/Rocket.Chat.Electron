import { combineReducers } from 'redux';

import { appReducer } from './appReducer';
import { downloadsReducer } from './downloadsReducer';
import {
  clientCertificates,
  externalProtocols,
  trustedCertificates,
} from './navigationReducers';
import { servers } from './serversReducer';
import { uiReducer } from './uiReducer';
import { updatesReducer } from './updatesReducer';

export const rootReducer = combineReducers({
  app: appReducer,
  downloads: downloadsReducer,
  updates: updatesReducer,
  ui: uiReducer,
  clientCertificates,
  externalProtocols,
  servers,
  trustedCertificates,
});
