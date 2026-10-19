import type { PhaseRecord, RecordedEvent } from './webSignals.lib';
import {
  buildRecorderSource,
  describeDetail,
  evaluatePhase,
  evaluateUnreadGrowth,
  prepareIndexHtml,
  routeRequest,
} from './webSignals.lib';

const event = (name: string, detail: string, t = 0): RecordedEvent => ({
  t,
  name,
  detail,
});

const both = (events: RecordedEvent[]) => ({
  main: events,
  isolated: events,
});

describe('routeRequest', () => {
  const serverOrigin = 'http://server.test';
  const route = (path: string, isDocument: boolean, method = 'GET') =>
    routeRequest({
      url: new URL(path, serverOrigin),
      serverOrigin,
      method,
      isDocument,
    });

  it('serves bundle assets from the bundle', () => {
    expect(route('/bundle/index-abc.js', false)).toBe('bundle');
  });

  it('gives a page navigation the bundle index', () => {
    expect(route('/home', true)).toBe('index');
    expect(route('/direct/abc', true)).toBe('index');
  });

  it('sends server routes, non-documents and other methods to the server', () => {
    expect(route('/api/v1/me', true)).toBe('server');
    expect(route('/avatar/user', false)).toBe('server');
    expect(route('/fonts/inter.woff2', false)).toBe('server');
    expect(route('/home', true, 'POST')).toBe('server');
  });

  it('sends other origins to the network', () => {
    expect(
      routeRequest({
        url: new URL('https://cdn.test/x.js'),
        serverOrigin,
        method: 'GET',
        isDocument: false,
      })
    ).toBe('server');
  });
});

describe('prepareIndexHtml', () => {
  it('adds the runtime config and the base path of the server', () => {
    const html = prepareIndexHtml(
      '<html><head><base href="/" /></head></html>',
      'https://chat.test/sub'
    );
    expect(html).toContain('<base href="/sub/" />');
    expect(html).toContain('"ROOT_URL":"https://chat.test/sub/"');
    expect(html).toContain('"ROOT_URL_PATH_PREFIX":"/sub"');
  });
});

describe('describeDetail', () => {
  it('describes primitives, null and objects', () => {
    expect(describeDetail(true)).toBe('boolean:true');
    expect(describeDetail(3)).toBe('number:3');
    expect(describeDetail(null)).toBe('null');
    expect(describeDetail({ rid: 'r1' })).toBe('object:{"rid":"r1"}');
  });
});

describe('buildRecorderSource', () => {
  it('records each signal event with its detail in the dataset of its world', () => {
    const listeners = new Map<string, (event: { detail: unknown }) => void>();
    const documentElement = { dataset: {} as Record<string, string> };
    const fakeWindow = {
      addEventListener: (
        name: string,
        listener: (event: { detail: unknown }) => void
      ) => listeners.set(name, listener),
    };
    // eslint-disable-next-line no-new-func
    new Function(
      'window',
      'document',
      'performance',
      buildRecorderSource('isolated')
    )(fakeWindow, { documentElement }, { now: () => 0 });

    listeners.get('startup')?.({ detail: true });
    listeners.get('unread-changed-by-subscription')?.({
      detail: { rid: 'r1' },
    });

    expect(JSON.parse(documentElement.dataset.signals_isolated)).toEqual([
      { t: 0, name: 'startup', detail: 'boolean:true' },
      {
        t: 0,
        name: 'unread-changed-by-subscription',
        detail: 'object:{"rid":"r1"}',
      },
    ]);
  });
});

describe('evaluatePhase', () => {
  it('passes when both worlds received every expected event', () => {
    const record: PhaseRecord = {
      phase: 'logged-in boot',
      events: both([
        event('status-changed', 'string:online'),
        event('startup', 'boolean:true'),
        event('Custom_Script_Logged_In', 'null'),
        event('unread-changed', 'number:0'),
      ]),
    };
    expect(evaluatePhase(record)).toEqual([]);
  });

  it('fails when the isolated world misses an event', () => {
    const record: PhaseRecord = {
      phase: 'forced logout',
      events: {
        main: [event('Custom_Script_Logged_Out', 'null')],
        isolated: [],
      },
    };
    expect(evaluatePhase(record)).toEqual([
      {
        phase: 'forced logout',
        world: 'isolated',
        event: 'Custom_Script_Logged_Out',
        reason: 'not received',
      },
    ]);
  });

  it('fails when the detail no longer has the expected shape', () => {
    const record: PhaseRecord = {
      phase: 'incoming message',
      events: both([
        event('unread-changed-by-subscription', 'null'),
        event('unread-changed', 'number:1'),
        event('notification', 'object:{}'),
      ]),
    };
    const failures = evaluatePhase(record);
    expect(
      failures.map(({ world, event: name }) => `${world}/${name}`)
    ).toEqual([
      'main/unread-changed-by-subscription',
      'isolated/unread-changed-by-subscription',
    ]);
  });

  it('does not expect Custom_Script_On_Logout, which the Meteor build skips', () => {
    const record: PhaseRecord = {
      phase: 'forced logout',
      events: both([event('Custom_Script_Logged_Out', 'null')]),
    };
    expect(evaluatePhase(record)).toEqual([]);
  });
});

describe('evaluateUnreadGrowth', () => {
  it('passes when the unread count grows', () => {
    expect(
      evaluateUnreadGrowth(
        [event('unread-changed', 'number:2')],
        [event('unread-changed', 'number:3')]
      )
    ).toEqual([]);
  });

  it('fails when the unread count stays the same', () => {
    expect(
      evaluateUnreadGrowth(
        [event('unread-changed', 'number:2')],
        [event('unread-changed', 'number:2')]
      )
    ).toHaveLength(1);
  });
});
