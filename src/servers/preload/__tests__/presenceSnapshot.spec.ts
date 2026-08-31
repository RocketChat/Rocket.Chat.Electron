import {
  buildPresenceSnapshot,
  mapConnectionStatus,
} from '../presenceSnapshot';

describe('mapConnectionStatus', () => {
  it.each([
    ['connected', 'connected'],
    ['connecting', 'connecting'],
    ['waiting', 'connecting'],
    ['failed', 'disconnected'],
    ['offline', 'disconnected'],
  ])('maps Meteor.status() %s to %s', (meteorStatus, expected) => {
    expect(mapConnectionStatus(meteorStatus)).toBe(expected);
  });

  it('falls back to disconnected for an unknown status', () => {
    expect(mapConnectionStatus('something-else')).toBe('disconnected');
  });

  it('falls back to disconnected when the status is missing', () => {
    expect(mapConnectionStatus(undefined)).toBe('disconnected');
  });

  // REGRESSION GUARD: a status value that collides with an inherited
  // Object.prototype member (e.g. 'toString') must not resolve to that
  // inherited function — it must fall back to 'disconnected'.
  it('falls back to disconnected for a status that collides with Object.prototype', () => {
    expect(mapConnectionStatus('toString')).toBe('disconnected');
  });
});

describe('buildPresenceSnapshot', () => {
  it('maps a store entry carrying status and statusText', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: { _id: 'u1', status: 'busy', statusText: 'In a meeting' },
        connectionStatus: 'connected',
        supported: true,
      })
    ).toEqual({
      presence: 'busy',
      presenceStatusText: 'In a meeting',
      presenceConnection: 'connected',
      presenceSupported: true,
    });
  });

  it('leaves statusText undefined when the store entry has none', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: { _id: 'u1', status: 'online' },
        connectionStatus: 'connected',
        supported: true,
      })
    ).toEqual({
      presence: 'online',
      presenceStatusText: undefined,
      presenceConnection: 'connected',
      presenceSupported: true,
    });
  });

  it('normalises an empty statusText to undefined', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: { _id: 'u1', status: 'away', statusText: '' },
        connectionStatus: 'connected',
        supported: true,
      }).presenceStatusText
    ).toBeUndefined();
  });

  // REGRESSION GUARD (CORE-2525): the original implementation derived
  // `supported` from `status !== undefined`, so a store entry (or a user
  // document) without a status reported the entire feature as unsupported and
  // blanked both the tray icon and the tray menu. `supported` must reflect
  // module availability only.
  it('keeps supported true when the entry has no status at all', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: { _id: 'u1' },
        connectionStatus: 'connected',
        supported: true,
      })
    ).toEqual({
      presence: undefined,
      presenceStatusText: undefined,
      presenceConnection: 'connected',
      presenceSupported: true,
    });
  });

  it('keeps supported true when there is no store entry yet', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: null,
        connectionStatus: 'connecting',
        supported: true,
      })
    ).toEqual({
      presence: undefined,
      presenceStatusText: undefined,
      presenceConnection: 'connecting',
      presenceSupported: true,
    });
  });

  it('reports unsupported and drops presence values when the module is unavailable', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: { _id: 'u1', status: 'online', statusText: 'Hi' },
        connectionStatus: 'connected',
        supported: false,
      })
    ).toEqual({
      presence: undefined,
      presenceStatusText: undefined,
      presenceConnection: 'connected',
      presenceSupported: false,
    });
  });

  it('still reports the connection status when the module is unavailable', () => {
    expect(
      buildPresenceSnapshot({
        connectionStatus: 'failed',
        supported: false,
      })
    ).toEqual({
      presence: undefined,
      presenceStatusText: undefined,
      presenceConnection: 'disconnected',
      presenceSupported: false,
    });
  });

  it.each(['online', 'away', 'busy', 'offline'])(
    'passes the %s presence value through',
    (status) => {
      expect(
        buildPresenceSnapshot({
          storeEntry: { _id: 'u1', status },
          connectionStatus: 'connected',
          supported: true,
        }).presence
      ).toBe(status);
    }
  );

  // The presence store can hold statuses the tray has no icon for (the webapp
  // writes `disabled` when presence is turned off server-side), so anything
  // outside the four supported values must not reach the tray.
  it('drops a presence value the tray cannot render', () => {
    expect(
      buildPresenceSnapshot({
        storeEntry: { _id: 'u1', status: 'disabled' },
        connectionStatus: 'connected',
        supported: true,
      })
    ).toEqual({
      presence: undefined,
      presenceStatusText: undefined,
      presenceConnection: 'connected',
      presenceSupported: true,
    });
  });
});
