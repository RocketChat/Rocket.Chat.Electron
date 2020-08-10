import React, { FC } from 'react';
import { useSelector } from 'react-redux';

import { selectServers, selectCurrentServerUrl } from '../../selectors';
import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';

export const ServersView: FC = () => {
	const servers = useSelector(selectServers);
	const currentServerUrl = useSelector(selectCurrentServerUrl);

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
