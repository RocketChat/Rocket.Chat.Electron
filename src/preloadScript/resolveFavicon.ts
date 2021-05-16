import type { Server } from '../common/types/Server';

const FAVICON_SIZE = 100;

export const resolveFavicon = (
  faviconUrl: string
): Promise<Server['favicon']> =>
  new Promise((resolve, reject) => {
    const image = document.createElement('img');

    image.src = faviconUrl;

    image.addEventListener(
      'load',
      () => {
        const canvas = document.createElement('canvas');
        canvas.width = FAVICON_SIZE;
        canvas.height = FAVICON_SIZE;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('failed to create canvas 2d context'));
          return;
        }

        ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
        ctx.drawImage(image, 0, 0, FAVICON_SIZE, FAVICON_SIZE);

        resolve(canvas.toDataURL());
      },
      {
        passive: true,
        once: true,
      }
    );

    image.addEventListener(
      'error',
      (event) => {
        reject(event.error);
      },
      { passive: true, once: true }
    );
  });
