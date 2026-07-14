import {
  Dropdown,
  Option,
  OptionContent,
  OptionDivider,
} from '@rocket.chat/fuselage';
import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedVersions } from '../../../servers/supportedVersions/types';
import { dispatch } from '../../../store';
import {
  SIDE_BAR_SERVER_RELOAD,
  SIDE_BAR_SERVER_COPY_URL,
  SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
  SIDE_BAR_SERVER_FORCE_RELOAD,
  SIDE_BAR_SERVER_REMOVE,
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  OPEN_SERVER_INFO_MODAL,
} from '../../actions';
import ServerInfoDropdown from '../SideBar/ServerInfoDropdown';
import { useDropdownVisibility } from '../SideBar/useDropdownVisibility';
import { Backdrop } from './styles';

type ServerActionType =
  | typeof SIDE_BAR_SERVER_RELOAD
  | typeof SIDE_BAR_SERVER_COPY_URL
  | typeof SIDE_BAR_SERVER_OPEN_DEV_TOOLS
  | typeof SIDE_BAR_SERVER_FORCE_RELOAD
  | typeof SIDE_BAR_SERVER_REMOVE;

type WorkspaceContextMenuProps = {
  reference: RefObject<HTMLElement | null>;
  target: RefObject<HTMLElement | null>;
  url: string;
  version?: string;
  exchangeUrl?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  supportedVersions?: SupportedVersions;
  onClose: () => void;
  showAddWorkspace?: boolean;
  placement?: 'right-start' | 'bottom-start';
};

const WorkspaceContextMenu = ({
  reference,
  target,
  url,
  version,
  exchangeUrl,
  isSupportedVersion,
  supportedVersionsSource,
  supportedVersionsFetchState,
  supportedVersions,
  onClose,
  showAddWorkspace,
  placement = 'right-start',
}: WorkspaceContextMenuProps) => {
  const { t } = useTranslation();

  const serverInfoReference = useRef(null);
  const serverInfoTarget = useRef(null);

  const { isVisible: isServerInfoVisible, toggle: toggleServerInfo } =
    useDropdownVisibility({
      reference: serverInfoReference,
      target: serverInfoTarget,
    });

  const handleActionDropdownClick = (
    action: ServerActionType,
    serverUrl: string
  ): void => {
    if (action) dispatch({ type: action, payload: serverUrl });
    onClose();
  };

  const handleOpenServerInfoModal = (): void => {
    dispatch({
      type: OPEN_SERVER_INFO_MODAL,
      payload: {
        url,
        version,
        exchangeUrl,
        isSupportedVersion,
        supportedVersionsSource,
        supportedVersionsFetchState,
        supportedVersions,
      },
    });
    onClose();
    toggleServerInfo(false);
  };

  const handleAddWorkspaceClick = (): void => {
    dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    const handleBlur = (): void => onClose();

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onClose]);

  return (
    <>
      <Backdrop role='presentation' onMouseDown={onClose} />
      <Dropdown reference={reference} ref={target} placement={placement}>
        <Option
          onClick={() => handleActionDropdownClick(SIDE_BAR_SERVER_RELOAD, url)}
        >
          <OptionContent>{t('sidebar.item.reload')}</OptionContent>
        </Option>
        <Option
          onClick={() =>
            handleActionDropdownClick(SIDE_BAR_SERVER_FORCE_RELOAD, url)
          }
        >
          <OptionContent>{t('sidebar.item.reloadClearingCache')}</OptionContent>
        </Option>
        <Option
          onClick={() =>
            handleActionDropdownClick(SIDE_BAR_SERVER_COPY_URL, url)
          }
        >
          <OptionContent>{t('sidebar.item.copyCurrentUrl')}</OptionContent>
        </Option>
        <Option
          onClick={() =>
            handleActionDropdownClick(SIDE_BAR_SERVER_OPEN_DEV_TOOLS, url)
          }
        >
          <OptionContent>{t('sidebar.item.openDevTools')}</OptionContent>
        </Option>
        <Option
          ref={serverInfoReference}
          onMouseEnter={() => toggleServerInfo(true)}
          onMouseLeave={() => toggleServerInfo(false)}
          onClick={handleOpenServerInfoModal}
        >
          <OptionContent>{t('sidebar.item.serverInfo')}</OptionContent>
        </Option>
        <Option
          onClick={(event) => {
            event?.stopPropagation();
            handleActionDropdownClick(SIDE_BAR_SERVER_REMOVE, url);
          }}
          variant='danger'
        >
          <OptionContent>{t('sidebar.item.remove')}</OptionContent>
        </Option>
        {showAddWorkspace && (
          <>
            <OptionDivider />
            <Option onClick={handleAddWorkspaceClick}>
              <OptionContent>{t('sidebar.item.addWorkspace')}</OptionContent>
            </Option>
          </>
        )}
      </Dropdown>
      {isServerInfoVisible && (
        <ServerInfoDropdown
          reference={serverInfoReference}
          target={serverInfoTarget}
          url={url}
          version={version}
          exchangeUrl={exchangeUrl}
          supportedVersions={supportedVersions}
          isSupportedVersion={isSupportedVersion}
          supportedVersionsSource={supportedVersionsSource}
          supportedVersionsFetchState={supportedVersionsFetchState}
        />
      )}
    </>
  );
};

export default WorkspaceContextMenu;
