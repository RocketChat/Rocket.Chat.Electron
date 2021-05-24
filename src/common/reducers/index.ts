import { combineReducers } from 'redux';

import { appReducer } from './appReducer';
import { downloadsReducer } from './downloadsReducer';
import { navigationReducer } from './navigationReducer';
import { serversReducer } from './serversReducer';
import { uiReducer } from './uiReducer';
import { updatesReducer } from './updatesReducer';

export const rootReducer = combineReducers({
  app: appReducer,
  downloads: downloadsReducer,
  navigation: navigationReducer,
  servers: serversReducer,
  updates: updatesReducer,
  ui: uiReducer,
});
