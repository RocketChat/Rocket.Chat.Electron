import React, { FC } from 'react';
import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';
import { useServers } from '../hooks/useServers'

export const ServersView: FC = () => {
  const servers = useServers()

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
