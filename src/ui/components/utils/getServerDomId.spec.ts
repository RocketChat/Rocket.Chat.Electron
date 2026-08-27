import { getServerPanelId, getServerTabId } from './getServerDomId';

describe('getServerDomId', () => {
  it('builds stable tab and panel ids for the same url', () => {
    const url = 'https://open.rocket.chat';
    const tabId = getServerTabId(url);
    const panelId = getServerPanelId(url);

    expect(tabId).toMatch(/^workspace-tab-/);
    expect(panelId).toMatch(/^workspace-panel-/);
    expect(tabId).toBe(getServerTabId(url));
    expect(panelId).toBe(getServerPanelId(url));
  });

  it('sanitizes non-alphanumeric characters and differentiates urls', () => {
    const a = getServerTabId('https://a.example/path');
    const b = getServerTabId('https://b.example/path');

    expect(a).not.toBe(b);
    expect(a).toMatch(/^workspace-tab-[A-Za-z0-9-]+$/);
  });
});
