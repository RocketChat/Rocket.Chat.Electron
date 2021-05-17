import { combineReducers } from 'redux';

import { appReducer } from './appReducer';
import { downloads } from './downloadsReducer';
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
  updates: updatesReducer,
  ui: uiReducer,
  clientCertificates,
  downloads,
  externalProtocols,
  servers,
  trustedCertificates,
});
