import { WEBVIEW_USER_PRESENCE_CHANGED } from '../../../ui/actions';
import type { Server } from '../../common';
import { servers } from '../../reducers';

const url = 'https://open.rocket.chat/';

describe('servers reducer — WEBVIEW_USER_PRESENCE_CHANGED', () => {
  it('upserts presence fields into a new server by url', () => {
    const newState = servers([], {
      type: WEBVIEW_USER_PRESENCE_CHANGED,
      payload: {
        url,
        presence: 'online',
        presenceStatusText: 'Working',
        presenceConnection: 'connected',
        presenceSupported: true,
      },
    } as any);

    expect(newState).toEqual([
      {
        url,
        presence: 'online',
        presenceStatusText: 'Working',
        presenceConnection: 'connected',
        presenceSupported: true,
      },
    ]);
  });

  it('upserts presence fields into an existing server, preserving other fields', () => {
    const existing: Server = { url, title: 'Open' };

    const newState = servers([existing], {
      type: WEBVIEW_USER_PRESENCE_CHANGED,
      payload: {
        url,
        presence: 'busy',
        presenceStatusText: undefined,
        presenceConnection: 'connecting',
        presenceSupported: true,
      },
    } as any);

    expect(newState).toEqual([
      {
        url,
        title: 'Open',
        presence: 'busy',
        presenceStatusText: undefined,
        presenceConnection: 'connecting',
        presenceSupported: true,
      },
    ]);
  });

  it('matches by url and does not affect other servers', () => {
    const other: Server = { url: 'https://other.rocket.chat/' };
    const existing: Server = { url, title: 'Open' };

    const newState = servers([existing, other], {
      type: WEBVIEW_USER_PRESENCE_CHANGED,
      payload: {
        url,
        presence: 'away',
        presenceStatusText: undefined,
        presenceConnection: 'connected',
        presenceSupported: true,
      },
    } as any);

    expect(newState.find((s) => s.url === other.url)).toEqual(other);
    expect(newState.find((s) => s.url === url)?.presence).toBe('away');
  });
});
