import type { FC } from 'react';
import React from 'react';

import { ServerPane } from './ServerPane';
import { useServers } from '../hooks/useServers';
import { ReparentingContainer } from '../utils/ReparentingContainer';

export const ServersView: FC = () => {
  const servers = useServers();

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
