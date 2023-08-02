import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

import type { Server } from '../../../servers/common';
import type { RootState } from '../../../store/rootReducer';
// TODO: change currentView.url string to URL type
export const useServers = (): (Server & { selected: boolean })[] =>
  useSelector(
    createSelector(
      ({ currentView }: RootState) => currentView,
      ({ servers }: RootState) => servers,
      (currentView, servers) => {
        const currentViewUrl =
          typeof currentView === 'object' ? new URL(currentView.url) : false;
        return servers.map((server) =>
          Object.assign(server, {
            selected:
              currentViewUrl &&
              currentViewUrl.href === new URL(server.url).href,
          })
        );
      }
    )
  );
