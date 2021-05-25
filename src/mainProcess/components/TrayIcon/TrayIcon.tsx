import { Menu, Tray } from 'electron';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import { selectGlobalBadge } from '../../../common/badgeSelectors';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { usePrevious } from '../../../common/hooks/usePrevious';
import { getAppIconPath, getTrayIconPath } from '../../icons';
import { useContextMenu } from './useContextMenu';

const onTrayIcon = (
  ref: MutableRefObject<Tray | undefined>,
  fn: (trayIcon: Tray) => void
): void => {
  if (!ref.current) {
    return;
  }

  fn(ref.current);
};

const TrayIcon = (): null => {
  const appName = useAppSelector((state) => state.app.name);
  const platform = useAppSelector((state) => state.app.platform);
  const badge = useAppSelector(selectGlobalBadge);
  const contextMenuTemplate = useContextMenu();
  const rootWindowVisible = useAppSelector(
    (state) => state.ui.rootWindow.state.visible
  );
  const prevRootWindowVisible = usePrevious(rootWindowVisible);
  const firstTrayIconBalloonShownRef = useRef(false);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const image = useMemo(
    () =>
      getTrayIconPath({
        platform,
        badge,
      }),
    [badge, platform]
  );

  const imageRef = useRef(image);
  const ref = useRef<Tray>();

  useEffect(() => {
    const trayIcon = new Tray(imageRef.current);

    if (platform !== 'darwin') {
      trayIcon.addListener('click', () => {
        dispatch(rootWindowActions.toggled());
      });
    }

    trayIcon.addListener('balloon-click', async () => {
      dispatch(rootWindowActions.toggled());
    });

    trayIcon.addListener('right-click', (_event, bounds) => {
      trayIcon.popUpContextMenu(undefined, bounds);
    });

    ref.current = trayIcon;

    return () => {
      trayIcon.destroy();
      ref.current = undefined;
    };
  }, [dispatch, platform]);

  useEffect(() => {
    onTrayIcon(ref, (trayIcon) => {
      trayIcon.setImage(image);
    });
  }, [image]);

  useEffect(() => {
    onTrayIcon(ref, (trayIcon) => {
      const title = Number.isInteger(badge) ? String(badge) : '';
      trayIcon.setTitle(title);
    });
  }, [badge]);

  useEffect(() => {
    onTrayIcon(ref, (trayIcon) => {
      if (badge === '•') {
        trayIcon.setToolTip(t('tray.tooltip.unreadMessage', { appName }));
        return;
      }

      if (Number.isInteger(badge)) {
        trayIcon.setToolTip(
          t('tray.tooltip.unreadMention', { appName, count: badge })
        );
        return;
      }

      trayIcon.setToolTip(t('tray.tooltip.noUnreadMessage', { appName }));
    });
  }, [appName, badge, t]);

  useEffect(() => {
    onTrayIcon(ref, (trayIcon) => {
      const menu = Menu.buildFromTemplate(contextMenuTemplate);
      trayIcon.setContextMenu(menu);
    });
  }, [contextMenuTemplate]);

  useEffect(() => {
    onTrayIcon(ref, (trayIcon) => {
      if (
        prevRootWindowVisible &&
        !rootWindowVisible &&
        platform === 'win32' &&
        !firstTrayIconBalloonShownRef.current
      ) {
        if (platform === 'win32') {
          trayIcon.displayBalloon({
            icon: getAppIconPath({ platform }),
            title: t('tray.balloon.stillRunning.title', { appName }),
            content: t('tray.balloon.stillRunning.content', {
              appName,
            }),
          });
        }

        firstTrayIconBalloonShownRef.current = true;
      }
    });
  }, [appName, platform, prevRootWindowVisible, rootWindowVisible, t]);

  return null;
};

export default TrayIcon;
