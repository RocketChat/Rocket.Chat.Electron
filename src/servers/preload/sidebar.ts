import { dispatch } from '../../store';
import {
  WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
  WEBVIEW_SIDEBAR_STYLE_CHANGED,
} from '../../ui/actions';
import type { Server } from '../common';
import { getServerUrl, getAbsoluteUrl } from './urls';

let timer: ReturnType<typeof setTimeout>;
let prevBackground: string;
let prevColor: string;
let prevBorder: string;
let serverVersion: string;

function versionIsGreaterOrEqualsTo(
  version1: string,
  version2: string
): boolean {
  const v1 = version1.match(/\d+/g)?.map(Number) || [];
  const v2 = version2.match(/\d+/g)?.map(Number) || [];

  for (let i = 0; i < 3; i++) {
    const n1 = v1[i] || 0;
    const n2 = v2[i] || 0;

    if (n1 > n2) {
      return true;
    }
    if (n1 < n2) {
      return false;
    }
  }

  return true;
}

const pollSidebarStyle = (
  referenceElement: Element,
  emit: (input: Server['style']) => void
): void => {
  clearTimeout(timer);

  document.body.append(referenceElement);
  const { background, color, border } =
    window.getComputedStyle(referenceElement);

  referenceElement.remove();

  const newBgg = prevBackground !== background ? background : prevBackground;
  const newColor = prevColor !== color ? color : prevColor;
  const newBorder = prevBorder !== border ? border : prevBorder;

  if (
    prevBackground !== background ||
    prevColor !== color ||
    newBorder !== border
  ) {
    emit({
      background: newBgg,
      color: newColor,
      border: newBorder,
    });
    prevBackground = background;
    prevColor = color;
    prevBorder = border;
  }

  timer = setTimeout(() => pollSidebarStyle(referenceElement, emit), 5000);
};

let element: HTMLElement;

const getElement = (): HTMLElement => {
  if (!element) {
    element = document.createElement('div');
    element.style.backgroundColor = 'var(--sidebar-background)';
    element.style.color = 'var(--sidebar-item-text-color)';
    element.style.display = 'none';
    if (versionIsGreaterOrEqualsTo(serverVersion, '6.3.0')) {
      element.classList.add('rcx-sidebar--main');
      element.style.border = '1px solid var(--sidebar-border-color)';
    } else {
      element.classList.add('sidebar');
    }
  }

  return element;
};

export const setServerVersionToSidebar = (version: string): void => {
  serverVersion = version;
};

export const setBackground = (imageUrl: string): void => {
  const element = getElement();

  element.style.backgroundImage = imageUrl
    ? `url(${JSON.stringify(getAbsoluteUrl(imageUrl))})`
    : 'none';

  pollSidebarStyle(element, (sideBarStyle) => {
    dispatch({
      type: WEBVIEW_SIDEBAR_STYLE_CHANGED,
      payload: {
        url: getServerUrl(),
        style: sideBarStyle,
      },
    });
  });
};

export const setSidebarCustomTheme = (customTheme: string): void => {
  dispatch({
    type: WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED,
    payload: {
      url: getServerUrl(),
      customTheme,
    },
  });
};
