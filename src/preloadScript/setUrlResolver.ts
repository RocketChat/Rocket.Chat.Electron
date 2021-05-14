export let getAbsoluteUrl: (relativePath?: string) => string;

let serverUrl: string;

export const setServerUrl = (_serverUrl: string): void => {
  serverUrl = _serverUrl;
};

export const getServerUrl = (): string => serverUrl;

export const setUrlResolver = (
  _getAbsoluteUrl: (relativePath?: string) => string
): void => {
  getAbsoluteUrl = _getAbsoluteUrl;
};
