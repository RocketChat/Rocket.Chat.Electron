import { parse as parseUrl } from 'url';

import { Icon } from '@rocket.chat/fuselage';
import React, { useMemo, FC, DragEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { createSelector } from 'reselect';

import { RootAction } from '../../../store/actions';
import { RootState } from '../../../store/rootReducer';
import {
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
} from '../../actions';
import {
  AddServerButton,
  AddServerButtonLabel,
  Avatar,
  Badge,
  Content,
  DownloadsManagerButton,
  DownloadsManagerLabel,
  Favicon,
  Initials,
  KeyboardShortcut,
  ServerButtonWrapper,
  ServerList,
  Wrapper,
} from './styles';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useSorting } from './useSorting';

type ServerButtonProps = {
  url: string;
  title: string;
  shortcutNumber: string;
  isSelected: boolean;
  favicon: string;
  isShortcutVisible: boolean;
  hasUnreadMessages: boolean;
  mentionCount?: number;
  isDragged: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

const ServerButton: FC<ServerButtonProps> = ({
  url,
  title,
  shortcutNumber,
  isSelected,
  favicon,
  isShortcutVisible,
  hasUnreadMessages,
  mentionCount,
  isDragged,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
}) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const handleServerClick = (): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
  };

  const initials = useMemo(() => title
    ?.replace(url, parseUrl(url).hostname)
    ?.split(/[^A-Za-z0-9]+/g)
    ?.slice(0, 2)
    ?.map((text) => text.slice(0, 1).toUpperCase())
    ?.join(''), [title, url]);

  const handleServerContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    dispatch({ type: SIDE_BAR_CONTEXT_MENU_TRIGGERED, payload: url });
  };

  return <ServerButtonWrapper
    draggable='true'
    tooltip={title}
    isSelected={isSelected}
    isDragged={isDragged}
    hasUnreadMessages={hasUnreadMessages}
    onClick={handleServerClick}
    onContextMenu={handleServerContextMenu}
    onDragOver={(event) => event.preventDefault()}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onDragEnter={onDragEnter}
    onDrop={onDrop}
  >
    <Avatar isSelected={isSelected}>
      <Initials visible={!favicon}>
        {initials}
      </Initials>
      <Favicon
        draggable='false'
        src={favicon ?? ''}
        visible={!!favicon}
      />
    </Avatar>
    {mentionCount && <Badge>{mentionCount}</Badge>}
    {shortcutNumber && <KeyboardShortcut visible={isShortcutVisible}>
      {process.platform === 'darwin' ? '⌘' : '^'}{shortcutNumber}
    </KeyboardShortcut>}
  </ServerButtonWrapper>;
};

export const SideBar: FC = () => {
  const servers = useSelector(
    createSelector(
      ({ currentView }: RootState) => currentView,
      ({ servers }: RootState) => servers,
      (currentView, servers) => servers.map((server) => Object.assign(server, {
        selected: typeof currentView === 'object' ? server.url === currentView.url : false,
      })),
    ),
  );
  const isSideBarEnabled = useSelector(({ isSideBarEnabled }: RootState) => isSideBarEnabled);
  const isVisible = servers.length > 0 && isSideBarEnabled;

  const {
    background,
    color,
  } = servers.find(({ selected }) => selected)?.style || {};

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

  return <Wrapper background={background} color={color} isVisible={isVisible}>
    <Content withWindowButtons={process.platform === 'darwin'}>
      <ServerList>
        {sortedServers.map((server, order) => <ServerButton
          key={server.url}
          url={server.url}
          title={server.title === 'Rocket.Chat' && parseUrl(server.url).host !== 'open.rocket.chat'
            ? `${ server.title } - ${ server.url }`
            : server.title}
          shortcutNumber={order <= 9 ? String(order + 1) : undefined}
          isSelected={server.selected}
          favicon={server.favicon}
          hasUnreadMessages={!!server.badge}
          mentionCount={typeof server.badge === 'number' ? server.badge : undefined}
          isShortcutVisible={isEachShortcutVisible}
          isDragged={draggedServerUrl === server.url}
          onDragStart={handleDragStart(server.url)}
          onDragEnd={handleDragEnd}
          onDragEnter={handleDragEnter(server.url)}
          onDrop={handleDrop(server.url)}
        />)}
      </ServerList>
      <AddServerButton>
        <AddServerButtonLabel
          tooltip={t('sidebar.addNewServer')}
          onClick={handleAddServerButtonClicked}
        >+</AddServerButtonLabel>
      </AddServerButton>
      <DownloadsManagerButton>
        <DownloadsManagerLabel
          tooltip={t('sidebar.downloads')}
          onClick={handelDownloadsButtonClicked}
        >
          <Icon name='download'/>
        </DownloadsManagerLabel>
      </DownloadsManagerButton>
    </Content>
  </Wrapper>;
};
