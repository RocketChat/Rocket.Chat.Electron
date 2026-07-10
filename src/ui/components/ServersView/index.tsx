import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { useServers } from '../hooks/useServers';
import { ReparentingContainer } from '../utils/ReparentingContainer';
import { ServerPane } from './ServerPane';

export const ServersView = () => {
  const servers = useServers();
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
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
          isSupported={server.isSupportedVersion}
          supportedVersionsFetchState={server.supportedVersionsFetchState}
          title={server.title}
          documentViewerOpenUrl={server.documentViewerOpenUrl}
          documentViewerFormat={server.documentViewerFormat}
          userLoggedIn={server.userLoggedIn}
          isTabPanel={navigationLayout === 'tabs'}
        />
      ))}
    </ReparentingContainer>
  );
};
