import React, { FC } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';

import { RootState } from '../../../store/rootReducer';
import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';

export const ServersView: FC = () => {
  const servers = useSelector(
    createSelector(
      ({ currentView }: RootState) => currentView,
      ({ servers }: RootState) => servers,
      (currentView, servers) => servers.map((server) => Object.assign(server, {
        selected: typeof currentView === 'object' ? server.url === currentView.url : false,
      })),
    ),
  );

  return <ReparentingContainer>
    {servers.map((server) => <ServerPane
      key={server.url}
      lastPath={server.lastPath}
      serverUrl={server.url}
      isSelected={server.selected}
      isFailed={server.failed}
    />)}
  </ReparentingContainer>;
};
