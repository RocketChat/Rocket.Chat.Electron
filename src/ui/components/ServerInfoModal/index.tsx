import { Box, Margins } from '@rocket.chat/fuselage';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { SupportedVersions } from '../../../servers/supportedVersions/types';
import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import { CLOSE_SERVER_INFO_MODAL } from '../../actions';
import { Dialog } from '../Dialog';
import ServerInfoContent from '../ServerInfoContent';

type ServerData = {
  url: string;
  version?: string;
  exchangeUrl?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  supportedVersions?: SupportedVersions;
};

export const ServerInfoModal = () => {
  const isVisible = useSelector(
    ({ dialogs }: RootState) => dialogs?.serverInfoModal?.isOpen ?? false
  );
  const serverData = useSelector(
    ({ dialogs }: RootState) =>
      (dialogs?.serverInfoModal?.serverData as ServerData | null) ?? null
  );

  const dispatch = useDispatch<Dispatch<RootAction>>();

  if (!serverData) {
    return null;
  }

  return (
    <Dialog
      isVisible={isVisible}
      onClose={() => dispatch({ type: CLOSE_SERVER_INFO_MODAL })}
    >
      <Margins block='x16'>
        <Box fontScale='h3' marginBlockEnd='x16'>
          Server Information
        </Box>

        <Box
          width='400px'
          style={{
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          <ServerInfoContent
            url={serverData.url}
            version={serverData.version}
            exchangeUrl={serverData.exchangeUrl}
            isSupportedVersion={serverData.isSupportedVersion}
            supportedVersionsSource={serverData.supportedVersionsSource}
            supportedVersionsFetchState={serverData.supportedVersionsFetchState}
            supportedVersions={serverData.supportedVersions}
            isModal
          />
        </Box>
      </Margins>
    </Dialog>
  );
};

export default ServerInfoModal;
