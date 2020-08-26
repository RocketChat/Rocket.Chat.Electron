import { WEBVIEW_FAVICON_CHANGED } from '../../actions';
import { dispatch } from '../../store';
import { getServerUrl } from './getServerUrl';

const FAVICON_SIZE = 100;

export function listenToFaviconChanges(): void {
  const canvas = document.createElement('canvas');
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;

  const ctx = canvas.getContext('2d');

  const image = new Image();

  const { Meteor } = window.require('meteor/meteor');
  const { Tracker } = window.require('meteor/tracker');
  const { settings } = window.require('/app/settings');

  Tracker.autorun(() => {
    const { url, defaultUrl } = settings.get('Assets_favicon') || {};
    const faviconUrl = url || defaultUrl;

    if (typeof faviconUrl !== 'string') {
      return;
    }

    image.src = Meteor.absoluteUrl(faviconUrl);
  });

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
}
