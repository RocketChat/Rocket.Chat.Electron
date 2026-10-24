import { dispatch } from '../../store';
import { WEBVIEW_FAVICON_CHANGED } from '../../ui/actions';
import { getAbsoluteUrl, getServerUrl } from './urls';
import { runWhenPreloadReady } from './whenPreloadReady';

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

// Both the Meteor and the Vite client can send an absolute URL, and both can
// set a URL resolver. A resolver prefixes the server URL also to an absolute
// URL, so an absolute URL is used as it is.
const isAbsoluteUrl = (url: string): boolean =>
  /^(https?:\/\/|data:)/i.test(url);

// A client without a URL resolver gets the path resolved against the server
// URL, with its subpath kept, as Meteor.absoluteUrl does.
const resolveAgainstServerUrl = (path: string): string => {
  const serverUrl = getServerUrl();
  const base = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
  return new URL(path.replace(/^\/+/, ''), base).href;
};

export const setFavicon = (faviconUrl: string): void => {
  if (typeof faviconUrl !== 'string') {
    return;
  }

  runWhenPreloadReady('favicon', () => {
    const imageElement = getImageElement();
    if (isAbsoluteUrl(faviconUrl)) {
      imageElement.src = faviconUrl;
      return;
    }

    imageElement.src = getAbsoluteUrl
      ? getAbsoluteUrl(faviconUrl)
      : resolveAgainstServerUrl(faviconUrl);
  });
};
