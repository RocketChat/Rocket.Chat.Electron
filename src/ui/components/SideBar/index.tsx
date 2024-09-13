import {
  Box,
  ButtonGroup,
  IconButton,
  MenuItem,
  MenuSection,
  MenuV2,
  OptionContent,
  OptionIcon,
} from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import {
  SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED,
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
  // const style = useMemo(
  //   () => servers.find(({ selected }) => selected)?.style || {},
  //   [servers]
  // );

  // const customTheme = useMemo(
  //   () => servers.find(({ selected }) => selected)?.customTheme || '',
  //   [servers]
  // );
  const isEachShortcutVisible = useKeyboardShortcuts();
  const {
    sortedServers,
    draggedServerUrl,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDrop,
  } = useSorting(servers);
  const handleAddServerButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
  };
  const handleDownloadsButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
  };
  const handleSettingsButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
  };

  const handleHideWorkspaceBar = (): void => {
    dispatch({
      type: SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED,
      payload: false,
    });
  };

  const handleMenuClick = (key: React.Key) => {
    switch (key) {
      case 'hide_workspace_bar':
        handleHideWorkspaceBar();
        break;
      case 'downloads':
        handleDownloadsButtonClicked();
        break;
      case 'desktop_settings':
        handleSettingsButtonClicked();
        break;
    }
  };

  const { t } = useTranslation();

  // const currentView = useSelector(({ currentView }: RootState) => currentView);

  return (
    <Box className='rcx-sidebar--main' bg='tint'>
      <Box
        width='x44'
        display={isVisible ? 'flex' : 'none'}
        height='100%'
        justifyContent='space-between'
        flexDirection='column'
        alignItems='center'
        paddingBlockStart='x8'
        paddingBlockEnd='x8'
      >
        <ButtonGroup vertical large>
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
              small
              icon='plus'
              onClick={handleAddServerButtonClicked}
              title={t('sidebar.tooltips.addWorkspace', {
                shortcut: process.platform === 'darwin' ? '⌘' : '^',
              })}
            ></IconButton>
          )}
        </ButtonGroup>

        <MenuV2
          title={t('sidebar.tooltips.settingsMenu')}
          placement='right'
          onAction={handleMenuClick}
        >
          <MenuSection title={t('sidebar.menuTitle')}>
            {/* <MenuItem key='hide_workspace_bar'>
              <OptionIcon name='burger-arrow-left' />
              <OptionContent>Hide workspace bar</OptionContent>
            </MenuItem> */}
            <MenuItem key='downloads'>
              <OptionIcon name='circle-arrow-down' />
              <OptionContent>{t('sidebar.downloads')}</OptionContent>
            </MenuItem>
            <MenuItem key='desktop_settings'>
              <OptionIcon name='customize' />
              <OptionContent>{t('sidebar.settings')}</OptionContent>
            </MenuItem>
          </MenuSection>
        </MenuV2>
      </Box>
    </Box>
  );
};
