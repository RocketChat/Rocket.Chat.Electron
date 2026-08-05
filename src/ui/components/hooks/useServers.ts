import { shallowEqual, useSelector } from 'react-redux';
import { createSelector } from 'reselect';

import type { Server } from '../../../servers/common';
import type { RootState } from '../../../store/rootReducer';

// TODO: change currentView.url string to URL type
const selectServersWithSelection = createSelector(
  ({ currentView }: RootState) => currentView,
  ({ servers }: RootState) => servers,
  (currentView, servers): (Server & { selected: boolean })[] => {
    const currentViewHref =
      typeof currentView === 'object' ? new URL(currentView.url).href : null;
    return servers.map((server) => ({
      ...server,
      selected:
        currentViewHref !== null &&
        currentViewHref === new URL(server.url).href,
    }));
  }
);

export const useServers = (): (Server & { selected: boolean })[] =>
  useSelector(selectServersWithSelection, shallowEqual);
