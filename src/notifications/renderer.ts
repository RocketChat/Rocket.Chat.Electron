import { handle } from '../ipc/renderer';

const iconCache = new Map<string, string>();

const inferContentTypeFromImageData = (data: ArrayBuffer): string | null => {
  const header = Array.from(new Uint8Array(data.slice(0, 3)))
    .map((byte) => byte.toString(16))
    .join('');
  switch (header) {
    case '89504e':
      return 'image/png';

    case '474946':
      return 'image/gif';

    case 'ffd8ff':
      return 'image/jpeg';

    default:
      return null;
  }
};

const fetchIcon = async (urlHref: string): Promise<string> => {
  const cache = iconCache.get(urlHref);

  if (cache) {
    return cache;
  }

  const response = await fetch(urlHref);
  const arrayBuffer = await response.arrayBuffer();
  const base64String = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );
  const contentType =
    inferContentTypeFromImageData(arrayBuffer) ||
    response.headers.get('content-type');
  const dataUri = `data:${contentType};base64,${base64String}`;
  iconCache.set(urlHref, dataUri);
  return dataUri;
};

export default (): void => {
  handle('notifications/fetch-icon', fetchIcon);
};
