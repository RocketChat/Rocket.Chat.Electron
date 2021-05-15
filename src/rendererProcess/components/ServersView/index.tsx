import React, { FC } from 'react';
import { createSelector } from 'reselect';

import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';

export const ServersView: FC = () => {
  const servers = useAppSelector(
    createSelector(
      ({ currentView }) => currentView,
      ({ servers }) => servers,
      (currentView, servers) =>
        servers.map((server) => ({
          ...server,
          selected:
            typeof currentView === 'object'
              ? server.url === currentView.url
              : false,
        }))
    )
  );

  return (
    <ReparentingContainer>
      {servers.map((server) => (
        <ServerPane
          key={server.url}
          lastPath={server.lastPath}
          serverUrl={server.url}
          isSelected={server.selected}
          isFailed={server.failed ?? false}
        />
      ))}
    </ReparentingContainer>
  );
};
