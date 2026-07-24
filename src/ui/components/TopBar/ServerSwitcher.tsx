import styled from '@emotion/styled';
import {
  Badge,
  Box,
  Dropdown,
  Icon,
  Option,
  OptionContent,
  OptionDivider,
  OptionIcon,
} from '@rocket.chat/fuselage';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { Server } from '../../../servers/common';
import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
} from '../../actions';
import { useDropdownVisibility } from '../SideBar/useDropdownVisibility';
import { useServers } from '../hooks/useServers';
import { formatServerTitle } from '../utils/formatServerTitle';

const hasNotification = (server: Server): boolean => Boolean(server.badge);

const mentionCountOf = (server: Server): number | undefined =>
  typeof server.badge === 'number' && server.badge > 0
    ? server.badge
    : undefined;

const Trigger = styled.button`
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  max-width: 320px;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--rcx-color-font-titles-labels, #2f343d);
  position: relative;
  -webkit-app-region: no-drag;

  &:hover {
    background-color: var(--rcx-color-surface-hover, rgba(0, 0, 0, 0.06));
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }
`;

const TriggerLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

// Signals unread activity in a server other than the active one, so the user
// knows to switch. Red for mentions, otherwise the neutral unread color.
const NotificationDot = styled.span<{ hasMention: boolean }>`
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ hasMention }) =>
    hasMention
      ? 'var(--rcx-color-badge-background-level-4, #d40c26)'
      : 'var(--rcx-color-badge-background-level-2, #f38c39)'};
`;

export const ServerSwitcher = () => {
  const servers = useServers();
  const { t } = useTranslation();
  const reference = useRef<HTMLButtonElement>(null);
  const target = useRef(null);
  const { isVisible, toggle } = useDropdownVisibility({ reference, target });

  const currentView = useSelector(({ currentView }: RootState) => currentView);

  const activeServer = servers.find((server) => server.selected);

  const otherServers = servers.filter((server) => !server.selected);
  const othersHaveNotification = otherServers.some(hasNotification);
  const othersHaveMention = otherServers.some(
    (server) => mentionCountOf(server) !== undefined
  );

  // The title reflects whichever view is open — a server, or one of the utility
  // pages (settings / downloads / add server).
  const label = (() => {
    switch (currentView) {
      case 'settings':
        return t('sidebar.settings');
      case 'downloads':
        return t('sidebar.downloads');
      case 'add-new-server':
        return t('sidebar.addNewServer');
      default:
        return activeServer
          ? formatServerTitle(activeServer.title ?? activeServer.url)
          : '';
    }
  })();

  const handleSelect = (url: string): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
    toggle(false);
  };

  const handleOpenSettings = (): void => {
    dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
    toggle(false);
  };

  const handleOpenDownloads = (): void => {
    dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
    toggle(false);
  };

  const handleAddServer = (): void => {
    dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
    toggle(false);
  };

  return (
    <>
      <Trigger
        ref={reference}
        type='button'
        aria-haspopup='listbox'
        aria-expanded={isVisible}
        aria-label={t('tabBar.workspaces')}
        title={label}
        onClick={() => toggle()}
      >
        <TriggerLabel>{label}</TriggerLabel>
        {othersHaveNotification && (
          <NotificationDot
            hasMention={othersHaveMention}
            data-testid='server-switcher-notification'
          />
        )}
        <Icon name='chevron-down' size='x16' />
      </Trigger>
      {isVisible && (
        <Dropdown reference={reference} ref={target} placement='bottom-start'>
          {servers.map((server) => {
            const mentionCount = mentionCountOf(server);
            return (
              <Option
                key={server.url}
                selected={server.selected}
                onClick={() => handleSelect(server.url)}
              >
                <OptionContent>
                  {formatServerTitle(server.title ?? server.url)}
                </OptionContent>
                {mentionCount !== undefined && (
                  <Box mis='x8'>
                    <Badge variant='secondary'>{mentionCount}</Badge>
                  </Box>
                )}
                {mentionCount === undefined && server.badge === '•' && (
                  <Box mis='x8'>
                    <NotificationDot hasMention={false} />
                  </Box>
                )}
              </Option>
            );
          })}
          {servers.length > 0 && <OptionDivider />}
          <Option
            selected={currentView === 'settings'}
            onClick={handleOpenSettings}
          >
            <OptionIcon name='customize' />
            <OptionContent>{t('sidebar.settings')}</OptionContent>
          </Option>
          <Option
            selected={currentView === 'downloads'}
            onClick={handleOpenDownloads}
          >
            <OptionIcon name='circle-arrow-down' />
            <OptionContent>{t('sidebar.downloads')}</OptionContent>
          </Option>
          <Option
            selected={currentView === 'add-new-server'}
            onClick={handleAddServer}
          >
            <OptionIcon name='plus' />
            <OptionContent>{t('sidebar.addNewServer')}</OptionContent>
          </Option>
        </Dropdown>
      )}
    </>
  );
};

export default ServerSwitcher;
