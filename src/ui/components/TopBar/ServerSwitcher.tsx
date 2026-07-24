import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Icon } from '@rocket.chat/fuselage';
import type { MouseEvent } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import {
  SERVER_CONTEXT_MENU_TRIGGERED,
  SERVER_SWITCHER_MENU_TRIGGERED,
} from '../../actions';
import { useServers } from '../hooks/useServers';
import { formatServerTitle } from '../utils/formatServerTitle';

// A persistent border (in the hover color) calls attention when another server
// has unread activity. A transparent border is always present so toggling it
// never shifts the layout.
const Trigger = styled.button<{ hasNotification: boolean }>`
  appearance: none;
  box-sizing: border-box;
  border: transparent;
  background: transparent;
  color: var(--rcx-color-font-titles-labels, #2f343d);
  outline: none;
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
  position: relative;
  -webkit-app-region: no-drag;

  &:hover {
    background-color: var(--rcx-color-surface-hover, rgba(0, 0, 0, 0.06));
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }

  & i {
    border-radius: 4px;
    ${({ hasNotification }) =>
      hasNotification &&
      css`
        background: var(--rcx-color-button-background-primary-default);
        color: var(--rcx-color-button-font-on-primary);
      `};
  }
`;

const TriggerLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

export const ServerSwitcher = () => {
  const servers = useServers();
  const { t } = useTranslation();
  const reference = useRef<HTMLButtonElement>(null);

  const currentView = useSelector(({ currentView }: RootState) => currentView);

  const activeServer = servers.find((server) => server.selected);

  const othersHaveNotification = servers.some(
    (server) => !server.selected && Boolean(server.badge)
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

  // Left click opens the native switcher menu (server list + utilities, with
  // shortcuts). Positioned under the trigger.
  const openSwitcherMenu = (): void => {
    const rect = reference.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    dispatch({
      type: SERVER_SWITCHER_MENU_TRIGGERED,
      payload: { x: Math.round(rect.left), y: Math.round(rect.bottom) },
    });
  };

  // Right click opens the native per-server actions (reload, remove, …) for the
  // active server.
  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    if (activeServer) {
      dispatch({
        type: SERVER_CONTEXT_MENU_TRIGGERED,
        payload: {
          x: event.clientX,
          y: event.clientY,
          url: activeServer.url,
        },
      });
    }
  };

  return (
    <>
      <Trigger
        ref={reference}
        type='button'
        hasNotification={othersHaveNotification}
        data-has-notification={othersHaveNotification}
        aria-haspopup='menu'
        aria-label={t('tabBar.workspaces')}
        title={label}
        onClick={openSwitcherMenu}
        onContextMenu={handleContextMenu}
      >
        <TriggerLabel>{label}</TriggerLabel>
        <Icon name='chevron-down' size='x16' />
      </Trigger>
    </>
  );
};

export default ServerSwitcher;
