import { parse } from 'url';

import { Icon } from '@rocket.chat/fuselage';
import React, { useMemo, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import { RootAction } from '../../../store/actions';
import { RootState } from '../../../store/rootReducer';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
} from '../../actions';
import ServerButton from './ServerButton';
import {
  AddServerButton,
  Content,
  DownloadsManagerButton,
  ServerList,
  Wrapper,
  SidebarActionButton,
} from './styles';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useSorting } from './useSorting';

export const SideBar: FC = () => {
  const servers = useSelector(
    createSelector(
      ({ currentView }: RootState) => currentView,
      ({ servers }: RootState) => servers,
      (currentView, servers) =>
        servers.map((server) =>
          Object.assign(server, {
            selected:
              typeof currentView === 'object'
                ? server.url === currentView.url
                : false,
          })
        )
    )
  );
  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
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

  const { t } = useTranslation();

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
        <AddServerButton>
          <SidebarActionButton
            tooltip={t('sidebar.addNewServer')}
            onClick={handleAddServerButtonClicked}
          >
            +
          </SidebarActionButton>
        </AddServerButton>
        <DownloadsManagerButton>
          <SidebarActionButton
            tooltip={t('sidebar.downloads')}
            onClick={handelDownloadsButtonClicked}
          >
            <Icon name='download' />
          </SidebarActionButton>
        </DownloadsManagerButton>
      </Content>
    </Wrapper>
  );
};
