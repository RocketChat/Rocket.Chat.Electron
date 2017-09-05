// @flow
import { ADD_SERVER, LOAD_SERVERS, SET_ACTIVE_SERVER } from '../actions/server';

export function servers(state = [], action) {
  switch (action.type) {
    case ADD_SERVER:
      return [].concat(state, action.server);
    case LOAD_SERVERS:
      return Object.keys(action.servers).map(key => action.servers[key]);
    default:
      return state;
  }
}

export function activeServer(state = '', action) {
  switch (action.type) {
    case SET_ACTIVE_SERVER:
      return action.host;
    default:
      return state;
  }
}
