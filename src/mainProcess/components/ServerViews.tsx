import React, { ReactElement } from 'react';

import { useAppSelector } from '../../common/hooks/useAppSelector';
import ServerView from './ServerView';

const ServerViews = (): ReactElement => {
  const servers = useAppSelector((state) => state.servers);

  return (
    <>
      {servers.map(({ url, webContentsId }) => (
        <ServerView key={url} url={url} webContentsId={webContentsId} />
      ))}
    </>
  );
};

export default ServerViews;
