import React, { FC } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';

export const ServersView: FC = () => {
  const servers = useSelector(({ servers }: RootState) => servers);
  const currentServerUrl = useSelector(({ currentServerUrl }: RootState) => currentServerUrl);

  return <ReparentingContainer>
    {servers.map((server) => <ServerPane
      key={server.url}
      lastPath={server.lastPath}
      serverUrl={server.url}
      isSelected={currentServerUrl === server.url}
      isFailed={server.failed}
    />)}
  </ReparentingContainer>;
};
