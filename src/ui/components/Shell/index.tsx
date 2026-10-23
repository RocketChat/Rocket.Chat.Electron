import { Box, PaletteStyleTag } from '@rocket.chat/fuselage';
import type { CSSProperties } from 'react';
import { useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { AddServerView } from '../AddServerView';
import { ClearCacheDialog } from '../ClearCacheDialog';
import { OutlookCredentialsDialog } from '../OutlookCredentialsDialog';
import { RootScreenSharePicker } from '../RootScreenSharePicker';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { ServerInfoModal } from '../ServerInfoModal';
import { ServersView } from '../ServersView';
import { SupportedVersionDialog } from '../SupportedVersionDialog';
import { TabBar } from '../TabBar';
import { MeatballMenuButton } from '../TabBar/MeatballMenuButton';
import { WindowControls } from '../TabBar/WindowControls';
import { TelephonyDefaultHandlerPromptModal } from '../TelephonyDefaultHandlerPromptModal';
import { TelephonyServerSelectModal } from '../TelephonyServerSelectModal';
import { TopBar } from '../TopBar';
import { DownloadsIndicator } from '../TopBar/DownloadsIndicator';
import { ServerSwitcher } from '../TopBar/ServerSwitcher';
import { UpdateLabel } from '../TopBar/UpdateLabel';
import { useShellTheme } from '../hooks/useShellTheme';
import TooltipProvider from '../utils/TooltipProvider';
import {
  CLIENT_CHROME_CORNER_RADIUS_PX,
  GlobalStyles,
  WindowDragBar,
} from './styles';

const getShellOuterBoxStyle = (
  usesRounding: boolean,
  isExpanded: boolean
): CSSProperties | undefined => {
  if (!usesRounding) {
    return undefined;
  }
  return {
    borderRadius: isExpanded ? 0 : CLIENT_CHROME_CORNER_RADIUS_PX,
    overflow: 'hidden',
    boxSizing: 'border-box',
    boxShadow: isExpanded
      ? undefined
      : 'inset 0 0 0 1px var(--rcx-color-shadow-elevation-border)',
  };
};

export const Shell = () => {
  const appPath = useSelector(({ appPath }: RootState) => appPath);
  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
  );
  const isLinuxSystemTitleBarEnabled = useSelector(
    ({ isLinuxSystemTitleBarEnabled }: RootState) =>
      isLinuxSystemTitleBarEnabled
  );
  const isWindowExpanded = useSelector(
    ({ rootWindowState }: RootState) =>
      rootWindowState.maximized || rootWindowState.fullscreen
  );

  const shellTheme = useShellTheme();

  // The window frame is set when the BrowserWindow is created and cannot change
  // dynamically. To keep the shell controls and outer styling matched to the
  // frame until the next restart, capture whether this Linux window has a native
  // frame on initial mount.
  const [isLinuxNativeFrame] = useState(
    () => process.platform === 'linux' && isLinuxSystemTitleBarEnabled
  );

  // Linux client chrome uses transparent background, CSS border-radius and
  // hairline border when not maximized (Windows already gets DWM rounding).
  const usesLinuxClientChromeRounding =
    process.platform === 'linux' && !isLinuxNativeFrame;

  const isClientDecorated =
    process.platform === 'win32' || usesLinuxClientChromeRounding;

  useLayoutEffect(() => {
    if (!appPath) {
      return undefined;
    }

    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = `${appPath}/app/icons/rocketchat.css`;
    document.head.append(linkElement);

    return () => {
      linkElement.remove();
    };
  }, [appPath]);

  return (
    <TooltipProvider>
      <PaletteStyleTag
        theme={shellTheme}
        selector=':root'
        // tagId='sidebar-palette'
      />
      <GlobalStyles
        isTransparentWindowEnabled={isTransparentWindowEnabled}
        usesLinuxClientChromeRounding={usesLinuxClientChromeRounding}
      />
      {navigationLayout !== 'tabs' && process.platform === 'darwin' && (
        <WindowDragBar />
      )}
      <Box
        data-testid='shell-outer-box'
        bg={isTransparentWindowEnabled ? 'transparent' : 'surface-neutral'}
        display='flex'
        flexWrap='nowrap'
        height='100%'
        width='100%'
        maxWidth='100%'
        flexDirection='column'
        style={getShellOuterBoxStyle(
          usesLinuxClientChromeRounding,
          isWindowExpanded
        )}
      >
        {/* Client-decorated tabs (Windows, Linux default): window controls in-strip. */}
        {navigationLayout === 'tabs' && isClientDecorated && (
          <TabBar
            leadingSlot={
              <>
                <MeatballMenuButton />
                <UpdateLabel />
                <DownloadsIndicator />
              </>
            }
            trailingSlot={<WindowControls />}
          />
        )}
        {/* Native-decorated tabs (macOS traffic lights, Linux system title bar): trailing controls. */}
        {navigationLayout === 'tabs' && !isClientDecorated && (
          <TabBar
            trailingSlot={
              <>
                <UpdateLabel />
                <DownloadsIndicator />
                <MeatballMenuButton />
              </>
            }
          />
        )}
        {/* Client-decorated non-tabs (Windows, Linux default): TopBar with WindowControls. */}
        {navigationLayout !== 'tabs' && isClientDecorated && (
          <TopBar
            leadingSlot={
              <>
                {navigationLayout === 'hidden' && <MeatballMenuButton tiny />}
                <UpdateLabel />
                <DownloadsIndicator compact />
              </>
            }
            centerSlot={
              navigationLayout === 'hidden' ? <ServerSwitcher /> : undefined
            }
            trailingSlot={<WindowControls />}
            textAlignment='left'
          />
        )}
        {/* macOS non-tabs: system traffic lights; trailing update/downloads. */}
        {navigationLayout !== 'tabs' && process.platform === 'darwin' && (
          <TopBar
            centerSlot={
              navigationLayout === 'hidden' ? <ServerSwitcher /> : undefined
            }
            trailingSlot={
              <>
                <UpdateLabel />
                <DownloadsIndicator compact />
              </>
            }
          />
        )}
        {/* Linux non-tabs (native WM frame): WM provides decorations; meatball preserved in hidden layout. */}
        {navigationLayout !== 'tabs' &&
          process.platform === 'linux' &&
          isLinuxNativeFrame && (
            <TopBar
              leadingSlot={
                navigationLayout === 'hidden' ? (
                  <MeatballMenuButton tiny />
                ) : undefined
              }
              centerSlot={
                navigationLayout === 'hidden' ? <ServerSwitcher /> : undefined
              }
              trailingSlot={
                <>
                  <UpdateLabel />
                  <DownloadsIndicator compact />
                </>
              }
            />
          )}
        <Box display='flex' flexDirection='row' flexGrow={1}>
          {navigationLayout === 'sidebar' && (
            <TabBar
              orientation='vertical'
              trailingSlot={<MeatballMenuButton orientation='vertical' />}
            />
          )}
          <Box
            width='100%'
            position='relative'
            alignSelf='stretch'
            flexBasis='1 1 auto'
            style={{
              boxShadow: '0 0 3px 0px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.1)',
              overflow: 'hidden',
              borderRadius: process.platform === 'darwin' ? '14px' : '8px',
              margin: '4px',
              marginTop: '0px',
              // Always set marginLeft explicitly: toggling it via a conditional
              // spread leaves React unable to restore the '4px' shorthand value
              // when the key is removed, so it would stick at 0 after switching.
              marginLeft: navigationLayout === 'sidebar' ? '0px' : '4px',
            }}
          >
            <ServersView />
            <AddServerView />
          </Box>
        </Box>
      </Box>
      <ServerInfoModal />
      <SupportedVersionDialog />
      <ScreenSharingDialog />
      <RootScreenSharePicker />
      <SelectClientCertificateDialog />
      <ClearCacheDialog />
      <OutlookCredentialsDialog />
      <TelephonyServerSelectModal />
      <TelephonyDefaultHandlerPromptModal />
    </TooltipProvider>
  );
};
