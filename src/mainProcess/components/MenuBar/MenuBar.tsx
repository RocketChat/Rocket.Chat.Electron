import { BrowserWindow, Menu } from 'electron';
import { useEffect } from 'react';

import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { useAppMenu } from './useAppMenu';
import { useEditMenu } from './useEditMenu';
import { useHelpMenu } from './useHelpMenu';
import { useViewMenu } from './useViewMenu';
import { useWindowMenu } from './useWindowMenu';

type MenuBarProps = {
  rootWindow?: BrowserWindow;
};

const MenuBar = ({ rootWindow }: MenuBarProps): null => {
  const appMenu = useAppMenu();
  const editMenu = useEditMenu();
  const viewMenu = useViewMenu();
  const windowMenu = useWindowMenu();
  const helpMenu = useHelpMenu();

  const platform = useAppSelector((state) => state.app.platform);

  useEffect(() => {
    const menu = Menu.buildFromTemplate([
      appMenu,
      editMenu,
      viewMenu,
      windowMenu,
      helpMenu,
    ]);

    if (platform === 'darwin') {
      Menu.setApplicationMenu(menu);
      return () => {
        Menu.setApplicationMenu(null);
      };
    }

    Menu.setApplicationMenu(null);
    rootWindow?.setMenu(menu);

    return () => {
      rootWindow?.setMenu(null);
    };
  }, [appMenu, editMenu, helpMenu, platform, rootWindow, viewMenu, windowMenu]);

  return null;
};

export default MenuBar;
