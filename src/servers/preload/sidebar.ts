import { dispatch } from '../../store';
import { WEBVIEW_SIDEBAR_STYLE_CHANGED } from '../../ui/actions';
import { Server } from '../common';
import { getServerUrl, getAbsoluteUrl } from './urls';

let timer: ReturnType<typeof setTimeout>;
let prevBackground: string;
let prevColor: string;

const pollSidebarStyle = (
  referenceElement: Element,
  emit: (input: Server['style']) => void
): void => {
  clearTimeout(timer);

  document.body.append(referenceElement);
  const { background, color } = window.getComputedStyle(referenceElement);

  referenceElement.remove();

  const newBgg = prevBackground !== background ? background : prevBackground;
  const newColor = prevColor !== color ? color : prevColor;

  if (prevBackground !== background || prevColor !== color) {
    emit({
      background: newBgg,
      color: newColor,
    });
    prevBackground = background;
    prevColor = color;
  }

  timer = setTimeout(() => pollSidebarStyle(referenceElement, emit), 5000);
};

let element: HTMLElement;

const getElement = (): HTMLElement => {
  if (!element) {
    element = document.createElement('div');
    element.classList.add('rcx-sidebar--main');
    element.style.backgroundColor = 'var(--sidebar-background)';
    element.style.color = 'var(--sidebar-item-text-color)';
    element.style.display = 'none';
  }

  return element;
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
