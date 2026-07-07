const sanitize = (url: string): string =>
  url.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const getServerTabId = (url: string): string =>
  `workspace-tab-${sanitize(url)}`;

export const getServerPanelId = (url: string): string =>
  `workspace-panel-${sanitize(url)}`;
