import { memoize } from '@rocket.chat/memo';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import Badge from '../common/components/assets/Badge';
import type { RootWindowIcon } from '../common/types/RootWindowIcon';

const waitForImage = (image: HTMLImageElement): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    image.addEventListener(
      'load',
      () => {
        resolve(image);
      },
      { once: true }
    );

    image.addEventListener(
      'error',
      (event) => {
        reject(event.error);
      },
      { once: true }
    );
  });

const getFaviconImage = memoize(
  async (src: string): Promise<HTMLImageElement> => {
    const faviconImage = document.createElement('img');
    faviconImage.src = src;

    return waitForImage(faviconImage);
  }
);

const getBadgeImage = memoize(
  async (badge: number | '•' | undefined): Promise<HTMLImageElement> => {
    const svg = renderToStaticMarkup(createElement(Badge, { value: badge }));

    const badgeImage = document.createElement('img');
    badgeImage.src = `data:image/svg+xml;base64,${btoa(svg)}`;

    return waitForImage(badgeImage);
  }
);

let canvas: HTMLCanvasElement;

const getCanvas = (size: number): HTMLCanvasElement => {
  if (!canvas) {
    canvas = document.createElement('canvas');
  }

  canvas.width = size;
  canvas.height = size;

  return canvas;
};

export const createRootWindowIconForLinux = async ({
  favicon,
  badge,
}: {
  favicon: string;
  badge: '•' | number | undefined;
}): Promise<RootWindowIcon> => {
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

  return {
    icon: representations,
  };
};

export const createRootWindowIconForWindows = async ({
  favicon,
  badge,
}: {
  favicon: string;
  badge: '•' | number | undefined;
}): Promise<RootWindowIcon> => {
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
    return {
      icon: representations,
    };
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

  return {
    icon: representations,
    overlay: [overlayRepresentation],
  };
};
