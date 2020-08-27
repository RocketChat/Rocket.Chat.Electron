import { dispatch } from '../../store';
import { WEBVIEW_SIDEBAR_STYLE_CHANGED } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl } from './getServerUrl';

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

export const listenToSideBarChanges = (): void => {
  const referenceElement = document.createElement('div');
  referenceElement.classList.add('sidebar');
  referenceElement.style.backgroundColor = 'var(--sidebar-background)';
  referenceElement.style.color = 'var(--sidebar-item-text-color)';
  referenceElement.style.display = 'none';

  const { Meteor } = window.require('meteor/meteor');
  const { Tracker } = window.require('meteor/tracker');
  const { settings } = window.require('/app/settings');

  Tracker.autorun(() => {
    const { url, defaultUrl } = settings.get('Assets_background') || {};
    const backgroundUrl = url || defaultUrl;

    if (backgroundUrl) {
      referenceElement.style.backgroundImage = `url(${ JSON.stringify(Meteor.absoluteUrl(backgroundUrl)) })`;
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
  });
};
