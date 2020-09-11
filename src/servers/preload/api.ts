import { createNotificationAPI } from '../../notifications/preload';
import { dispatch } from '../../store';
import {
  WEBVIEW_UNREAD_CHANGED,
  WEBVIEW_FAVICON_CHANGED,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
  WEBVIEW_TITLE_CHANGED,
} from '../../ui/actions';
import { Server } from '../common';

type ServerInfo = {
  version: string;
};

export let serverInfo: ServerInfo;

export let getAbsoluteUrl: (relativePath?: string) => string;

export const getServerUrl = (): string =>
  getAbsoluteUrl().replace(/\/$/, '');

export type RocketChatDesktopAPI = {
  setServerInfo: (serverInfo: ServerInfo) => void;
  setUrlResolver: (getAbsoluteUrl: (relativePath?: string) => string) => void;
  setBadge: (badge: Server['badge']) => void;
  setFavicon: (faviconUrl: string) => void;
  setBackground: (imageUrl: string) => void;
  setTitle: (title: string) => void;
  Notification: typeof Notification;
};

const FAVICON_SIZE = 100;

let timer: ReturnType<typeof setTimeout>;
let prevBackground: string;
let prevColor: string;

const pollSidebarStyle = (referenceElement: Element, emit: (input: Server['style']) => void): void => {
  clearTimeout(timer);

  document.body.append(referenceElement);
  const {
    background,
    color,
  } = window.getComputedStyle(referenceElement);
  referenceElement.remove();

  if (prevBackground !== background || prevColor !== color) {
    emit({
      background,
      color,
    });
    prevBackground = background;
    prevColor = color;
  }

  timer = setTimeout(() => pollSidebarStyle(referenceElement, emit), 1000);
};

export const createRocketChatDesktopAPI = (): RocketChatDesktopAPI => ({
  setServerInfo: (_serverInfo) => {
    serverInfo = _serverInfo;
  },
  setUrlResolver: (_getAbsoluteUrl) => {
    getAbsoluteUrl = _getAbsoluteUrl;
  },
  setBadge: (badge) => {
    dispatch({
      type: WEBVIEW_UNREAD_CHANGED,
      payload: {
        url: getServerUrl(),
        badge,
      },
    });
  },
  setFavicon: (faviconUrl) => {
    if (typeof faviconUrl !== 'string') {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;

    const ctx = canvas.getContext('2d');

    const image = new Image();

    const handleImageLoadEvent = (): void => {
      ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
      ctx.drawImage(image, 0, 0, FAVICON_SIZE, FAVICON_SIZE);

      dispatch({
        type: WEBVIEW_FAVICON_CHANGED,
        payload: {
          url: getServerUrl(),
          favicon: canvas.toDataURL(),
        },
      });
    };

    image.addEventListener('load', handleImageLoadEvent, { passive: true });

    image.src = getAbsoluteUrl(faviconUrl);
  },
  setBackground: (imageUrl) => {
    const referenceElement = document.createElement('div');
    referenceElement.classList.add('sidebar');
    referenceElement.style.backgroundColor = 'var(--sidebar-background)';
    referenceElement.style.color = 'var(--sidebar-item-text-color)';
    referenceElement.style.display = 'none';

    if (imageUrl) {
      referenceElement.style.backgroundImage = `url(${ JSON.stringify(getAbsoluteUrl(imageUrl)) })`;
    } else {
      referenceElement.style.backgroundImage = null;
    }

    pollSidebarStyle(referenceElement, (sideBarStyle) => {
      dispatch({
        type: WEBVIEW_SIDEBAR_STYLE_CHANGED,
        payload: {
          url: getServerUrl(),
          style: sideBarStyle,
        },
      });
    });
  },
  setTitle: (title) => {
    if (typeof title !== 'string') {
      return;
    }

    dispatch({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url: getServerUrl(),
        title,
      },
    });
  },
  Notification: createNotificationAPI(),
});
