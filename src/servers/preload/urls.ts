export let getAbsoluteUrl: (relativePath?: string) => string;

export const getServerUrl = (): string =>
  getAbsoluteUrl().replace(/\/$/, '');

export const setUrlResolver = (_getAbsoluteUrl: (relativePath?: string) => string): void => {
  getAbsoluteUrl = _getAbsoluteUrl;
};
