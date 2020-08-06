import React from 'react';
import { useSelector } from 'react-redux';

import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';

export function ServersView() {
	const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);

	return <ReparentingContainer>
		{servers.map((server) => <ServerPane
			key={server.url}
			lastPath={server.lastPath}
			url={server.url}
			isSelected={currentServerUrl === server.url}
		/>)}
	</ReparentingContainer>;
}
