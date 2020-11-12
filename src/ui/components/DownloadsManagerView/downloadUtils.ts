// Utility function for bytes conversion. TODO: seperate into another file.
export const formatBytes = (bytes: number, decimals = 2, size = false): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (size) {
    return `${ parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) } ${ sizes[i] }`;
  }

  return String(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)));
};

//  Filetype to Mimetype mapping
export const mapping = {
  application: 'Files',
  image: 'Images',
  video: 'Videos',
  audio: 'Audios',
  text: 'Texts',
} as const;
