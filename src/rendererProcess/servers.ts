import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStructuredSelector } from 'reselect';

import { ROOT_WINDOW_ICON_CHANGED } from '../common/actions/uiActions';
import Badge from '../common/components/assets/Badge';
import { dispatch, watch } from '../common/store';
import type { RootState } from '../common/types/RootState';
import type { Server } from '../common/types/Server';
import { handle } from '../ipc/renderer';
import { resolveServerUrl } from './resolveServerUrl';

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
  favicon: ({ servers, ui: { view } }: RootState) =>
    (typeof view === 'object'
      ? servers.find((server) => server.url === view.url)?.favicon
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
  handle('servers/resolve-url', resolveServerUrl);

  if (process.platform === 'linux') {
    watch(selectBadgeAndFavicon, updateRootWindowIconForLinux);
  }

  if (process.platform === 'win32') {
    watch(selectBadgeAndFavicon, updateRootWindowIconForWindows);
  }
};
