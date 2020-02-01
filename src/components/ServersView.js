import React from 'react';

import { ServerView } from './ServerView';

export function ServersView({
	servers = [],
	currentServerUrl,
	hasSidebar = true,
}) {
	return <>
		{servers.map((server) => <ServerView
			key={server.url}
			active={currentServerUrl === server.url}
			hasSidebar={hasSidebar}
			lastPath={server.lastPath}
			url={server.url}
		/>)}
	</>;
}
