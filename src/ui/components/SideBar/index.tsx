import { parse } from 'url';

import { Icon } from '@rocket.chat/fuselage';
import React, { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';

import { RootAction } from '../../../store/actions';
import { RootState } from '../../../store/rootReducer';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
} from '../../actions';
import { useServers } from '../hooks/useServers';
import ServerButton from './ServerButton';
import {
  Wrapper,
  Content,
  ServerList,
  AddServerButton,
  SidebarActionButton,
  Button,
  BottomButtons,
} from './styles';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useSorting } from './useSorting';

export const SideBar: FC = () => {
  const servers = useServers();

  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
  );

  const isAddNewServersEnabled = useSelector(
    ({ isAddNewServersEnabled }: RootState) => isAddNewServersEnabled
  );
  const isVisible = servers.length > 0 && isSideBarEnabled;
  const style = useMemo(
    () => servers.find(({ selected }) => selected)?.style || {},
    [servers]
  );
  const isEachShortcutVisible = useKeyboardShortcuts();
  const {
    sortedServers,
    draggedServerUrl,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDrop,
  } = useSorting(servers);
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const handleAddServerButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
  };
  const handelDownloadsButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
  };
  const handelSettingsButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
  };
  const { t } = useTranslation();

  const currentView = useSelector(({ currentView }: RootState) => currentView);

  return (
    <Wrapper sideBarStyle={style} isVisible={isVisible}>
      <Content withWindowButtons={process.platform === 'darwin'}>
        <ServerList>
          {sortedServers.map((server, order) => (
            <ServerButton
              key={server.url}
              url={server.url}
              title={
                server.title === 'Rocket.Chat' &&
                parse(server.url).hostname !== 'open.rocket.chat'
                  ? `${server.title} - ${server.url}`
                  : server.title ?? server.url
              }
              shortcutNumber={
                typeof order === 'number' && order <= 9
                  ? String(order + 1)
                  : null
              }
              isSelected={server.selected}
              favicon={server.favicon ?? null}
              hasUnreadMessages={!!server.badge}
              userLoggedIn={server.userLoggedIn}
              mentionCount={
                typeof server.badge === 'number' ? server.badge : undefined
              }
              isShortcutVisible={isEachShortcutVisible}
              isDragged={draggedServerUrl === server.url}
              onDragStart={handleDragStart(server.url)}
              onDragEnd={handleDragEnd}
              onDragEnter={handleDragEnter(server.url)}
              onDrop={handleDrop(server.url)}
            />
          ))}
        </ServerList>
        {isAddNewServersEnabled && (
          <AddServerButton>
            <SidebarActionButton
              tooltip={t('sidebar.addNewServer')}
              onClick={handleAddServerButtonClicked}
            >
              +
            </SidebarActionButton>
          </AddServerButton>
        )}
        <BottomButtons>
          <Button>
            <SidebarActionButton
              tooltip={t('sidebar.downloads')}
              onClick={handelDownloadsButtonClicked}
              isSelected={currentView === 'downloads'}
            >
              <Icon name='download' />
            </SidebarActionButton>
          </Button>
          <Button>
            <SidebarActionButton
              tooltip={t('sidebar.settings')}
              onClick={handelSettingsButtonClicked}
              isSelected={currentView === 'settings'}
            >
              <Icon name='cog' />
            </SidebarActionButton>
          </Button>
        </BottomButtons>
      </Content>
    </Wrapper>
  );
};
