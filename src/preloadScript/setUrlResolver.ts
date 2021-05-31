let serverUrl: string;

export const setServerUrl = (_serverUrl: string): void => {
  serverUrl = _serverUrl;
};

export const getServerUrl = (): string => serverUrl;
