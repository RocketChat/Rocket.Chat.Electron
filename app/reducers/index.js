// @flow
import { combineReducers } from 'redux';
import { routerReducer as router } from 'react-router-redux';
import { servers, activeServer } from './server';
import { sidebarStatus } from './sidebar';
import update from './update';

const rootReducer = combineReducers({
  servers,
  activeServer,
  router,
  sidebarStatus,
  update
});

export default rootReducer;
