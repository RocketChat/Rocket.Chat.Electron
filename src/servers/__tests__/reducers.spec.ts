import { APP_SETTINGS_LOADED } from '../../app/actions';
import { WEBVIEW_DID_NAVIGATE } from '../../ui/actions';
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

describe('servers reducer last path', () => {
  // The page of a credentialed workspace URL loads without the credentials.
  it('saves the last path of a workspace URL with credentials', () => {
    const url = 'https://alice:s3cret@chat.example.com/';
    const state = servers([{ url }], {
      type: WEBVIEW_DID_NAVIGATE,
      payload: { url, pageUrl: 'https://chat.example.com/channel/general' },
    });

    expect(state[0].lastPath).toBe('https://chat.example.com/channel/general');
  });
});
