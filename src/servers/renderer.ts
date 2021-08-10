import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStructuredSelector } from 'reselect';

import { handle } from '../ipc/renderer';
import { dispatch, watch } from '../store';
import { RootState } from '../store/rootReducer';
import { ROOT_WINDOW_ICON_CHANGED } from '../ui/actions';
import Badge from '../ui/icons/Badge';
import { Server } from './common';

export const fetchInfo = async (
  urlHref: string
): Promise<[urlHref: string, version: string]> => {
  const url = new URL(urlHref);

  const { username, password } = url;
  const headers = new Headers();

  if (username && password) {
    headers.append('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }

  const homeResponse = await fetch(url.href, { headers });

  if (!homeResponse.ok) {
    throw new Error(homeResponse.statusText);
  }

  const endpoint = new URL('api/info', homeResponse.url);

  const apiInfoResponse = await fetch(endpoint.href, { headers });

  if (!apiInfoResponse.ok) {
    throw new Error(apiInfoResponse.statusText);
  }

  const responseBody: {
    success: boolean;
    version: string;
  } = await apiInfoResponse.json();

  if (!responseBody.success) {
    throw new Error();
  }

  return [new URL('..', apiInfoResponse.url).href, responseBody.version];
};

type RootWindowIconParams = {
  badge: Server['badge'] | undefined;
  favicon: string | undefined;
};

const selectBadgeAndFavicon = createStructuredSelector<
  RootState,
  RootWindowIconParams
>({
  badge: ({ servers }: RootState) => {
    const badges = servers.map(({ badge }) => badge);

    const mentionCount = badges
      .filter((badge): badge is number => Number.isInteger(badge))
      .reduce<number>((sum, count: number) => sum + count, 0);

    if (mentionCount > 0) {
      return mentionCount;
    }

    if (badges.some((badge) => !!badge)) {
      return '•';
    }

    return undefined;
  },
  favicon: ({ currentView, servers }: RootState) =>
    (typeof currentView === 'object'
      ? servers.find((server) => server.url === currentView.url)?.favicon
      : undefined) ?? undefined,
});

let faviconImage: HTMLImageElement;

const getFaviconImage = async (src: string): Promise<HTMLImageElement> => {
  if (!faviconImage) {
    faviconImage = new Image();
  }

  if (faviconImage.src !== src) {
    faviconImage.src = src;

    return new Promise((resolve, reject) => {
      faviconImage.addEventListener('load', () => {
        resolve(faviconImage);
      });
      faviconImage.addEventListener('error', (event) => {
        reject(event.error);
      });
    });
  }

  return faviconImage;
};

let badgeImage: HTMLImageElement;

const getBadgeImage = async (
  badge: RootWindowIconParams['badge']
): Promise<HTMLImageElement> => {
  if (!badgeImage) {
    badgeImage = new Image();
  }

  if (badgeImage.dataset.badge !== badge) {
    const svg = renderToStaticMarkup(createElement(Badge, { value: badge }));
    badgeImage.src = `data:image/svg+xml;base64,${btoa(svg)}`;

    return new Promise((resolve, reject) => {
      badgeImage.addEventListener('load', () => {
        resolve(badgeImage);
      });
      badgeImage.addEventListener('error', (event) => {
        reject(event.error);
      });
    });
  }

  return badgeImage;
};

let canvas: HTMLCanvasElement;

const getCanvas = (size: number): HTMLCanvasElement => {
  if (!canvas) {
    canvas = document.createElement('canvas');
  }

  canvas.width = size;
  canvas.height = size;

  return canvas;
};

const updateRootWindowIconForLinux = async ({
  badge,
  favicon,
}: RootWindowIconParams): Promise<void> => {
  if (!favicon) {
    dispatch({
      type: ROOT_WINDOW_ICON_CHANGED,
      payload: null,
    });
    return;
  }

  const faviconImage = await getFaviconImage(favicon);
  const badgeImage = await getBadgeImage(badge);

  const representations = [64, 48, 40, 32, 24, 20, 16].map((size) => {
    const canvas = getCanvas(size);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('failed to create canvas 2d context');
    }

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(faviconImage, 0, 0, size, size);

    if (badge) {
      const badgeSize = size / 3;
      const badgeHoleSize = size / 2;
      const badgeOffset =
        size - badgeHoleSize + (badgeHoleSize - badgeSize) / 2;

      ctx.beginPath();
      ctx.arc(
        size - badgeHoleSize / 2,
        size - badgeHoleSize / 2,
        badgeHoleSize / 2,
        0,
        2 * Math.PI
      );
      ctx.rect(
        size - badgeHoleSize / 2,
        size - badgeHoleSize / 2,
        badgeHoleSize / 2,
        badgeHoleSize / 2
      );
      ctx.closePath();
      ctx.clip();
      ctx.clearRect(0, 0, size, size);

      ctx.drawImage(badgeImage, badgeOffset, badgeOffset, badgeSize, badgeSize);
    }

    return {
      width: size,
      height: size,
      dataURL: canvas.toDataURL('image/png'),
    };
  });

  dispatch({
    type: ROOT_WINDOW_ICON_CHANGED,
    payload: {
      icon: representations,
    },
  });
};

const updateRootWindowIconForWindows = async ({
  badge,
  favicon,
}: RootWindowIconParams): Promise<void> => {
  if (!favicon) {
    dispatch({
      type: ROOT_WINDOW_ICON_CHANGED,
      payload: null,
    });
    return;
  }

  const faviconImage = await getFaviconImage(favicon);

  const representations = [256, 64, 48, 40, 32, 24, 20, 16].map((size) => {
    const canvas = getCanvas(size);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('failed to create canvas 2d context');
    }

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(faviconImage, 0, 0, size, size);

    return {
      width: size,
      height: size,
      dataURL: canvas.toDataURL('image/png'),
    };
  });

  if (!badge) {
    dispatch({
      type: ROOT_WINDOW_ICON_CHANGED,
      payload: {
        icon: representations,
      },
    });

    return;
  }

  const overlayImage = await getBadgeImage(badge);

  const size = 32;
  const canvas = getCanvas(size);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('failed to create canvas 2d context');
  }

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(overlayImage, 0, 0, size, size);

  const overlayRepresentation = {
    width: size,
    height: size,
    dataURL: canvas.toDataURL('image/png'),
  };

  dispatch({
    type: ROOT_WINDOW_ICON_CHANGED,
    payload: {
      icon: representations,
      overlay: [overlayRepresentation],
    },
  });
};

export default (): void => {
  handle('servers/fetch-info', fetchInfo);

  if (process.platform === 'linux') {
    watch(selectBadgeAndFavicon, updateRootWindowIconForLinux);
  }

  if (process.platform === 'win32') {
    watch(selectBadgeAndFavicon, updateRootWindowIconForWindows);
  }
};
