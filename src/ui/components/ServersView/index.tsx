import React, { FC } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import { ServerPane } from './ServerPane';

export const ServersView: FC = () => {
  const entries = useSelector(
    ({ servers, currentServerUrl }: RootState) =>
      servers.map((server) => ({
        url: server.url,
        selected: currentServerUrl === server.url,
        failed: server.failed,
      })),
  );

  return <>
    {entries.map(({ url, selected, failed }) => <ServerPane
      key={url}
      serverUrl={url}
      selected={selected}
      failed={failed}
    />)}
  </>;
};
