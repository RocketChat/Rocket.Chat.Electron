import type { WebContents } from 'electron';
import { BrowserWindow } from 'electron';
import i18next from 'i18next';

import { watch } from '../../../store';

export const setupImageAnimationPolicy = (contents: WebContents): void => {
  const unwatch = watch(
    ({ isAnimatedImagesEnabled }) => isAnimatedImagesEnabled,
    (enabled) => {
      if (!contents.isDestroyed()) {
        contents.setImageAnimationPolicy(enabled ? 'animate' : 'noAnimation');
      }
    }
  );
  contents.once('destroyed', unwatch);
};

export const canViewImageAnimation = (src: string): boolean => {
  try {
    return ['https:', 'http:'].includes(new URL(src).protocol);
  } catch {
    return false;
  }
};

export const viewImageAnimation = (source: WebContents, src: string): void => {
  if (source.isDestroyed() || !canViewImageAnimation(src)) {
    return;
  }

  // Keep the workspace's authentication, but never execute a returned page's
  // scripts or preload. The image viewer has its own animation policy.
  const viewer = new BrowserWindow({
    width: 640,
    height: 480,
    title: i18next.t('contextMenu.viewImageAnimation'),
    autoHideMenuBar: true,
    webPreferences: {
      session: source.session,
      imageAnimationPolicy: 'animate',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
    },
  });
  viewer.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  viewer.webContents.on('will-navigate', (event) => event.preventDefault());
  viewer.webContents.on('will-redirect', (event, url) => {
    if (!canViewImageAnimation(url)) {
      event.preventDefault();
    }
  });
  viewer.loadURL(src, { httpReferrer: source.getURL() }).catch(() => {
    if (!viewer.isDestroyed()) {
      viewer.close();
    }
  });
};
