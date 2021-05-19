import type { RootState } from '../common/types/RootState';
import type { Server } from '../common/types/Server';
import { joinAppPath } from './joinAppPath';
import { joinUserPath } from './joinUserPath';
import { readJsonObject } from './readJsonObject';

export const mergeServers = async (
  state: RootState,
  localStorage: Record<string, string>
): Promise<RootState> => {
  let { servers } = state;
  const {
    ui: { view },
  } = state;
  let currentServerUrl = typeof view === 'object' ? view.url : null;

  const serversMap = new Map<Server['url'], Server>(
    servers
      .filter(Boolean)
      .filter(
        ({ url, title }) => typeof url === 'string' && typeof title === 'string'
      )
      .map((server) => [server.url, server])
  );

  if (localStorage['rocket.chat.hosts']) {
    try {
      const storedString = JSON.parse(localStorage['rocket.chat.hosts']);

      if (/^https?:\/\//.test(storedString)) {
        serversMap.set(storedString, {
          url: storedString,
          title: storedString,
        });
      } else {
        const storedValue = JSON.parse(storedString);

        if (Array.isArray(storedValue)) {
          storedValue
            .map((url) => url.replace(/\/$/, ''))
            .forEach((url) => {
              serversMap.set(url, { url, title: url });
            });
        }
      }
    } catch (error) {
      console.warn(error);
    }
  }

  if (serversMap.size === 0) {
    const appConfiguration = await readJsonObject(joinAppPath('servers.json'));

    for (const [title, url] of Object.entries(appConfiguration)) {
      if (typeof url !== 'string') {
        continue;
      }
      serversMap.set(url, { url, title });
    }

    const userConfiguration = await readJsonObject(
      joinUserPath('servers.json')
    );

    for (const [title, url] of Object.entries(userConfiguration)) {
      if (typeof url !== 'string') {
        continue;
      }
      serversMap.set(url, { url, title });
    }
  }

  if (
    localStorage['rocket.chat.currentHost'] &&
    localStorage['rocket.chat.currentHost'] !== 'null'
  ) {
    currentServerUrl = localStorage['rocket.chat.currentHost'];
  }

  servers = Array.from(serversMap.values());
  currentServerUrl = currentServerUrl
    ? serversMap.get(currentServerUrl)?.url ?? servers[0]?.url ?? null
    : null;

  if (localStorage['rocket.chat.sortOrder']) {
    try {
      const sorting = JSON.parse(localStorage['rocket.chat.sortOrder']);
      if (Array.isArray(sorting)) {
        servers = [...serversMap.values()].sort(
          (a, b) => sorting.indexOf(a.url) - sorting.indexOf(b.url)
        );
      }
    } catch (error) {
      console.warn(error);
    }
  }

  return {
    ...state,
    servers,
    ui: {
      ...state.ui,
      view: currentServerUrl ? { url: currentServerUrl } : state.ui.view,
    },
  };
};
