import { IconButton } from '@rocket.chat/fuselage';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import { SIDE_BAR_ADD_NEW_SERVER_CLICKED } from '../../actions';
import { isDarwin } from '../../utils/platform';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useServers } from '../hooks/useServers';
import { useShellTheme } from '../hooks/useShellTheme';
import { useSorting } from '../hooks/useSorting';
import WorkspaceTab from './WorkspaceTab';
import {
  TabBarButtonWrapper,
  DragSpacer,
  Strip,
  TabList,
  TrafficLightSpacer,
} from './styles';
import type { TabOrientation } from './styles';
import { useTabBarLayout } from './useTabBarLayout';

type TabBarProps = {
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  orientation?: TabOrientation;
};

export const TabBar = ({
  leadingSlot,
  trailingSlot,
  orientation = 'horizontal',
}: TabBarProps) => {
  const isVertical = orientation === 'vertical';
  const { t } = useTranslation();

  const servers = useServers();

  const isAddNewServersEnabled = useSelector(
    ({ isAddNewServersEnabled }: RootState) => isAddNewServersEnabled
  );

  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );

  const paletteTheme = useShellTheme();

  const isFullscreen = useSelector(
    ({ rootWindowState }: RootState) => rootWindowState.fullscreen
  );

  const isEachShortcutVisible = useKeyboardShortcuts();
  const {
    sortedServers,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDrop,
  } = useSorting(servers);

  const activeServer = sortedServers.find((server) => server.selected);

  const layout = useTabBarLayout(
    sortedServers,
    activeServer?.url,
    isAddNewServersEnabled
  );

  // The width-based layout is meaningless for a fixed-width vertical column, so
  // show every server stacked (the column scrolls) with labels hidden.
  const { tabListRef } = layout;
  const visibleServers = isVertical ? sortedServers : layout.visibleServers;
  const compact = isVertical ? false : layout.compact;

  const hasSelectedServer = visibleServers.some((server) => server.selected);

  const handleAddServerButtonClicked = (): void => {
    dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED });
  };

  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
    );

    if (tabs.length === 0) {
      return;
    }

    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);

    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex =
          currentIndex === -1 || currentIndex === tabs.length - 1
            ? 0
            : currentIndex + 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    tabs[nextIndex]?.focus();
  };

  return (
    <Strip
      isTransparentWindowEnabled={isTransparentWindowEnabled}
      paletteTheme={paletteTheme}
      orientation={orientation}
    >
      {isDarwin && !isVertical && (
        <TrafficLightSpacer collapsed={isFullscreen} />
      )}
      {leadingSlot}
      <TabList
        ref={tabListRef}
        role='tablist'
        aria-label={t('tabBar.workspaces')}
        aria-orientation={isVertical ? 'vertical' : 'horizontal'}
        orientation={orientation}
        onKeyDown={handleTabListKeyDown}
      >
        {visibleServers.map((server, index) => {
          const order = sortedServers.indexOf(server);
          const shortcutNumber =
            order >= 0 && order <= 8 ? String(order + 1) : null;

          return (
            <WorkspaceTab
              key={server.url}
              url={server.url}
              title={server.title ?? server.url}
              favicon={server.favicon ?? null}
              isSelected={server.selected}
              badge={server.badge}
              userLoggedIn={server.userLoggedIn}
              compact={compact}
              orientation={orientation}
              shortcutNumber={shortcutNumber}
              isShortcutVisible={isEachShortcutVisible}
              tabIndex={
                server.selected || (!hasSelectedServer && index === 0) ? 0 : -1
              }
              version={server.version}
              isSupportedVersion={server.isSupportedVersion}
              supportedVersionsSource={server.supportedVersionsSource}
              supportedVersionsFetchState={server.supportedVersionsFetchState}
              supportedVersions={server.supportedVersions}
              exchangeUrl={server.outlookCredentials?.serverUrl}
              showAddWorkspace={isAddNewServersEnabled}
              onDragStart={handleDragStart(server.url)}
              onDragEnd={handleDragEnd}
              onDragEnter={handleDragEnter(server.url)}
              onDrop={handleDrop(server.url)}
            />
          );
        })}
        {isAddNewServersEnabled && (
          <TabBarButtonWrapper>
            <IconButton
              medium
              icon='plus-small'
              title={t('tabBar.addWorkspace')}
              onClick={handleAddServerButtonClicked}
            />
          </TabBarButtonWrapper>
        )}
      </TabList>
      <DragSpacer orientation={orientation} />
      {trailingSlot}
    </Strip>
  );
};
