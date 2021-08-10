import { dispatch } from '../../store';
import { WEBVIEW_FAVICON_CHANGED } from '../../ui/actions';
import { getAbsoluteUrl, getServerUrl } from './urls';

const FAVICON_SIZE = 100;

let imageElement: HTMLImageElement;

const getImageElement = (): HTMLImageElement => {
  if (!imageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = FAVICON_SIZE;
    canvas.height = FAVICON_SIZE;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('failed to create canvas 2d context');
    }

    imageElement = new Image();

    const handleImageLoadEvent = (): void => {
      ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
      ctx.drawImage(imageElement, 0, 0, FAVICON_SIZE, FAVICON_SIZE);

      dispatch({
        type: WEBVIEW_FAVICON_CHANGED,
        payload: {
          url: getServerUrl(),
          favicon: canvas.toDataURL(),
        },
      });
    };

    imageElement.addEventListener('load', handleImageLoadEvent, {
      passive: true,
    });
  }

  return imageElement;
};

export const setFavicon = (faviconUrl: string): void => {
  if (typeof faviconUrl !== 'string') {
    return;
  }

  const imageElement = getImageElement();
  imageElement.src = getAbsoluteUrl(faviconUrl);
};
