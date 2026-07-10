const hash = (url: string): string => {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

const sanitize = (url: string): string =>
  `${url.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${hash(url)}`;

export const getServerTabId = (url: string): string =>
  `workspace-tab-${sanitize(url)}`;

export const getServerPanelId = (url: string): string =>
  `workspace-panel-${sanitize(url)}`;
