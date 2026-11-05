import { APP_SETTINGS_LOADED } from '../../app/actions';
import { WEBVIEW_ATTACHED } from '../../ui/actions';
import { SERVER_UI_PREVIEW_CHANGED } from '../actions';
import type { Server } from '../common';
import { servers } from '../reducers';

describe('servers reducer UI preview state', () => {
  const previewed: Server = {
    url: 'https://open.rocket.chat/',
    uiPreview: 'PR #42601 @ 0d421fd',
    uiPreviewSource: '42601',
  };
  const other: Server = { url: 'https://other.rocket.chat/' };

  // injected.ts trusts this flag to skip boot recovery, so a stale one would leave a real server UI unrecovered.
  it('drops every UI preview when settings load at startup', () => {
    const state = servers([], {
      type: APP_SETTINGS_LOADED,
      payload: { servers: [previewed, other] },
    });

    expect(state.map(({ uiPreview }) => uiPreview)).toEqual([
      undefined,
      undefined,
    ]);
    expect(state.map(({ uiPreviewSource }) => uiPreviewSource)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('sets and clears the preview of one server only', () => {
    const applied = servers([{ url: previewed.url }, other], {
      type: SERVER_UI_PREVIEW_CHANGED,
      payload: {
        url: previewed.url,
        uiPreview: previewed.uiPreview,
        uiPreviewSource: previewed.uiPreviewSource,
      },
    });
    expect(applied).toEqual([previewed, other]);

    const restored = servers(applied, {
      type: SERVER_UI_PREVIEW_CHANGED,
      payload: {
        url: previewed.url,
        uiPreview: undefined,
        uiPreviewSource: undefined,
      },
    });
    expect(restored[0].uiPreview).toBeUndefined();
    expect(restored[1]).toBe(other);
  });
});

describe('servers reducer webContents ids', () => {
  // A webContents id is valid for one run only. A stale id from the last run
  // can equal the id of another server's webview in this run, and a lookup
  // by id then names the wrong server.
  it('drops every webContents id when settings load at startup', () => {
    const state = servers([], {
      type: APP_SETTINGS_LOADED,
      payload: {
        servers: [
          { url: 'https://open.rocket.chat/', webContentsId: 3 },
          { url: 'http://localhost:3300/', webContentsId: 3 },
        ],
      },
    });

    expect(state.map(({ webContentsId }) => webContentsId)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('keeps the webContents id that a webview attach sets in this run', () => {
    const loaded = servers([], {
      type: APP_SETTINGS_LOADED,
      payload: {
        servers: [
          { url: 'https://open.rocket.chat/', webContentsId: 3 },
          { url: 'http://localhost:3300/', webContentsId: 3 },
        ],
      },
    });
    const attached = servers(loaded, {
      type: WEBVIEW_ATTACHED,
      payload: { url: 'http://localhost:3300/', webContentsId: 3 },
    });

    expect(
      attached
        .filter(({ webContentsId }) => webContentsId === 3)
        .map(({ url }) => url)
    ).toEqual(['http://localhost:3300/']);
  });
});
