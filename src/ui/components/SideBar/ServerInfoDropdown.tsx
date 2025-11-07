import { Dropdown } from '@rocket.chat/fuselage';
import type { RefObject } from 'react';

import type { SupportedVersions } from '../../../servers/supportedVersions/types';
import ServerInfoContent from '../ServerInfoContent';

type ServerInfoDropdownProps = {
  reference: RefObject<HTMLElement>;
  target: RefObject<HTMLElement>;
  url: string;
  version?: string;
  exchangeUrl?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  supportedVersions?: SupportedVersions;
};

const ServerInfoDropdown = ({
  reference,
  target,
  url,
  version,
  exchangeUrl,
  isSupportedVersion,
  supportedVersionsSource,
  supportedVersionsFetchState,
  supportedVersions,
}: ServerInfoDropdownProps) => {
  return (
    <Dropdown reference={reference} ref={target} placement='right-start'>
      <ServerInfoContent
        url={url}
        version={version}
        exchangeUrl={exchangeUrl}
        isSupportedVersion={isSupportedVersion}
        supportedVersionsSource={supportedVersionsSource}
        supportedVersionsFetchState={supportedVersionsFetchState}
        supportedVersions={supportedVersions}
      />
    </Dropdown>
  );
};

export default ServerInfoDropdown;
