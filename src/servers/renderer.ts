import { createStructuredSelector } from 'reselect';

import { handle } from '../ipc/renderer';
import { dispatch, watch } from '../store';
import { RootState } from '../store/rootReducer';
import { ROOT_WINDOW_ICON_CHANGED } from '../ui/actions';

export const fetchInfo = async (urlHref: string): Promise<[urlHref: string, version: string]> => {
  const url = new URL(urlHref);

  const { username, password } = url;
  const headers = new Headers();

  if (username && password) {
    headers.append('Authorization', `Basic ${ btoa(`${ username }:${ password }`) }`);
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
  badge: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '+9' | '•' | undefined;
  favicon: string | undefined;
}

const selectBadgeAndFavicon = createStructuredSelector<RootState, RootWindowIconParams>({
  badge: ({ servers }: RootState) => {
    const badges = servers.map(({ badge }) => badge);

    const mentionCount = badges
      .filter((badge) => Number.isInteger(badge))
      .reduce<number>((sum, count: number) => sum + count, 0);

    if (mentionCount > 0) {
      return mentionCount <= 9 ? (String(mentionCount) as RootWindowIconParams['badge']) : '+9';
    }

    if (badges.some((badge) => !!badge)) {
      return '•';
    }

    return undefined;
  },
  favicon: ({
    currentServerUrl,
    servers,
  }: RootState) => servers.find((server) => server.url === currentServerUrl)?.favicon,
});

let faviconImage: HTMLImageElement;

const getFaviconImage = async (src: string): Promise<HTMLImageElement> => {
  if (!faviconImage) {
    faviconImage = new Image();
  }

  if (faviconImage.src !== src) {
    faviconImage.src = src;

    return new Promise((resolve, reject) => {
      faviconImage.onload = () => resolve(faviconImage);
      faviconImage.onerror = (event: ErrorEvent) => reject(event.error);
    });
  }

  return faviconImage;
};

let badgeImage: HTMLImageElement;

const getBadgeImage = async (badge: RootWindowIconParams['badge']): Promise<HTMLImageElement> => {
  if (!badgeImage) {
    badgeImage = new Image();
  }

  if (badgeImage.dataset.badge !== badge) {
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
        <path fill='#f5455c' fill-rule='nonzero' d='M47.5 56C41.14872538 56 36 50.8512746 36 44.5 36 38.14872538 41.14872538 33 47.5 33 53.8512746 33 59 38.14872538 59 44.5 59 50.8512746 53.8512746 56 47.5 56z'/>
        ${ (badge === '1' && '<path fill="#FFF" d="M44.4 39h4.4v8.8H51V50h-6.6v-2.2h2.2v-6.6h-2.2z"/>')
          || (badge === '2' && '<path fill="#FFF" d="M43.1 40.1h1.1V39h6.6v1.1h1.1v4.4h-1.1v1.1h-5.5v2.2h6.6V50h-8.8v-5.5h1.1v-1.1h5.5v-2.2h-4.4v1.1h-2.2z"/>')
          || (badge === '3' && '<path fill="#FFF" d="M43.1 40.1h1.1V39h6.6v1.1h1.1v3.3h-1.1v2.2h1.1v3.3h-1.1V50h-6.6v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-4.4v-2.2h4.4v-2.2h-4.4v1.1h-2.2z"/>')
          || (badge === '4' && '<path fill="#FFF" d="M43.1 39h2.2v4.4h4.4V39h2.2v11h-2.2v-4.4h-6.6z"/>')
          || (badge === '5' && '<path fill="#FFF" d="M42.9 39h8.8v2.2h-6.6v2.2h5.5v1.1h1.1v4.4h-1.1V50H44v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-6.6z"/>')
          || (badge === '6' && '<path fill="#FFF" d="M43.1 40.1h1.1V39h6.6v1.1h1.1v2.2h-2.2v-1.1h-4.4v2.2h5.5v1.1h1.1v4.4h-1.1V50h-6.6v-1.1h-1.1v-8.8zm2.2 7.7h4.4v-2.2h-4.4v2.2z"/>')
          || (badge === '7' && '<path fill="#FFF" d="M42.8 40.1h1.1V39h6.6v1.1h1.1V50h-2.2v-8.8H45v3.3h-2.2z"/>')
          || (badge === '8' && '<path fill="#FFF" d="M43.1 40.1h1.1V39h6.6v1.1h1.1v3.3h-1.1v2.2h1.1v3.3h-1.1V50h-6.6v-1.1h-1.1v-3.3h1.1v-2.2h-1.1v-3.3zm2.2 7.7h4.4v-2.2h-4.4v2.2zm0-4.4h4.4v-2.2h-4.4v2.2z"/>')
          || (badge === '9' && '<path fill="#FFF" d="M43.1 40.1h1.1V39h6.6v1.1h1.1v8.8h-1.1V50h-6.6v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-5.5v-1.1h-1.1v-4.4zm2.2 1.1v2.2h4.4v-2.2h-4.4z"/>')
          || (badge === '+9' && '<path fill="#FFF" d="M39.3 43.5h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2zm7.68-3h1v-1h6v1h1v8h-1v1h-6v-1h-1v-2h2v1h4v-2h-5v-1h-1v-4zm2 1v2h4v-2h-4z"/>')
          || (badge === '•' && '<circle cx="47.5" cy="44.5" r="3.5" fill="#FFF"/>') }
      </svg>
    `;
    badgeImage.src = `data:image/svg+xml;base64,${ btoa(svg) }`;

    return new Promise((resolve, reject) => {
      badgeImage.onload = () => resolve(badgeImage);
      badgeImage.onerror = (event: ErrorEvent) => reject(event.error);
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

const updateRootWindowIconForLinux = async ({ badge, favicon }: RootWindowIconParams): Promise<void> => {
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

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(faviconImage, 0, 0, size, size);

    if (badge) {
      const badgeSize = size / 3;
      const badgeHoleSize = size / 2;
      const badgeOffset = size - badgeHoleSize + (badgeHoleSize - badgeSize) / 2;

      ctx.beginPath();
      ctx.arc(size - badgeHoleSize / 2, size - badgeHoleSize / 2, badgeHoleSize / 2, 0, 2 * Math.PI);
      ctx.rect(size - badgeHoleSize / 2, size - badgeHoleSize / 2, badgeHoleSize / 2, badgeHoleSize / 2);
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

const updateRootWindowIconForWindows = async ({ badge, favicon }: RootWindowIconParams): Promise<void> => {
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
