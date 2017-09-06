import store from '../utils/store';

export const ADD_SERVER = 'ADD_SERVER';
export const LOAD_SERVERS = 'LOAD_SERVERS';
export const SET_ACTIVE_SERVER = 'SET_ACTIVE_SERVER';

export function addServer(server) {
  const servers = store.get('servers', {});
  servers[server.url] = server;
  store.set({ servers, activeServer: server.url });
  return {
    type: ADD_SERVER,
    server
  };
}

export function removeServer(url) {
  const servers = store.get('servers', {});
  delete servers[url];
  store.set({ servers });
  return {
    type: LOAD_SERVERS,
    servers
  };
}

export function loadServers() {
  const servers = store.get('servers', {});
  return {
    type: LOAD_SERVERS,
    servers
  };
}

export function updateServer(host, update) {
  console.log(update);
  const servers = store.get('servers', {});
  console.log(servers);
  servers[host] = Object.assign({}, servers[host], update);
  store.set({ servers });
  return {
    type: LOAD_SERVERS,
    servers
  };
}

export function setActive(host) {
  store.set('activeServer', host);
  return {
    type: SET_ACTIVE_SERVER,
    host
  };
}
