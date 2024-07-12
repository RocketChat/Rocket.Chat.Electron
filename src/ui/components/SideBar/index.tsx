import { Box, Icon, IconButton } from '@rocket.chat/fuselage';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
} from '../../actions';
import { useServers } from '../hooks/useServers';
import ServerButton from './ServerButton';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useSorting } from './useSorting';

export const SideBar = () => {
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

  const customTheme = useMemo(
    () => servers.find(({ selected }) => selected)?.customTheme || '',
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
    <Box className='rcx-sidebar--main' bg='tint'>
      <Box
        width='x44'
        display='flex'
        height='100%'
        justifyContent='space-between'
        flexDirection='column'
        alignItems='center'
      >
        <Box cursor='pointer'>
          {sortedServers.map((server, order) => (
            <ServerButton
              key={server.url}
              url={server.url}
              title={
                server.title === 'Rocket.Chat' &&
                new URL(server.url).hostname !== 'open.rocket.chat'
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
          {isAddNewServersEnabled && (
            <IconButton
              icon='plus'
              onClick={handleAddServerButtonClicked}
            ></IconButton>
          )}
        </Box>

        <Box>
          <IconButton icon='download' />

          <IconButton icon='cog' />
        </Box>
      </Box>
    </Box>
  );
};
