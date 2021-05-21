export const inferContentTypeFromImageData = (
  data: ArrayBuffer
): string | null => {
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
