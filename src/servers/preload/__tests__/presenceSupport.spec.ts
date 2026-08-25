import { hasUsablePresenceApi } from '../presenceSupport';

describe('hasUsablePresenceApi', () => {
  it('returns true for a module with a valid Presence (store + listen + get + stop functions)', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: new Map(),
          listen: () => undefined,
          get: () => undefined,
          stop: () => undefined,
        },
      })
    ).toBe(true);
  });

  it('returns false when store is present but listen is not a function', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: new Map(),
          listen: 'not-a-function',
          get: () => undefined,
          stop: () => undefined,
        },
      })
    ).toBe(false);
  });

  it('returns false when Presence is present but store is missing', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          listen: () => undefined,
          get: () => undefined,
          stop: () => undefined,
        },
      })
    ).toBe(false);
  });

  it('returns false when store is present but undefined', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: undefined,
          listen: () => undefined,
          get: () => undefined,
          stop: () => undefined,
        },
      })
    ).toBe(false);
  });

  it('returns false when get is missing', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: new Map(),
          listen: () => undefined,
          stop: () => undefined,
        },
      })
    ).toBe(false);
  });

  it('returns false when stop is missing', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: new Map(),
          listen: () => undefined,
          get: () => undefined,
        },
      })
    ).toBe(false);
  });

  it('returns false when get is not a function', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: new Map(),
          listen: () => undefined,
          get: 'not-a-function',
          stop: () => undefined,
        },
      })
    ).toBe(false);
  });

  it('returns false when stop is not a function', () => {
    expect(
      hasUsablePresenceApi({
        Presence: {
          store: new Map(),
          listen: () => undefined,
          get: () => undefined,
          stop: 'not-a-function',
        },
      })
    ).toBe(false);
  });

  it('returns false when get and stop are only inherited from the prototype chain', () => {
    const proto = { get: () => undefined, stop: () => undefined };
    const resolved = Object.create(proto, {
      store: { value: new Map(), enumerable: true },
      listen: { value: () => undefined, enumerable: true },
    });

    expect(hasUsablePresenceApi({ Presence: resolved })).toBe(false);
  });

  it('returns false when Presence is missing entirely', () => {
    expect(hasUsablePresenceApi({})).toBe(false);
  });

  it('returns false when the module itself is null', () => {
    expect(hasUsablePresenceApi(null)).toBe(false);
  });

  it('returns false when the module itself is undefined', () => {
    expect(hasUsablePresenceApi(undefined)).toBe(false);
  });

  it('returns false when listen is a non-function truthy value (string)', () => {
    expect(
      hasUsablePresenceApi({
        Presence: { store: new Map(), listen: 'listen' },
      })
    ).toBe(false);
  });

  it('returns false when listen is a non-function truthy value (object)', () => {
    expect(
      hasUsablePresenceApi({
        Presence: { store: new Map(), listen: {} },
      })
    ).toBe(false);
  });

  // REGRESSION GUARD (prototype-safety): store/listen values reaching the
  // check only via the prototype chain — never as the object's own
  // properties — must not be treated as a usable API.
  it('returns false when store and listen are only inherited from the prototype chain', () => {
    const proto = { store: new Map(), listen: () => undefined };
    const inherited = Object.create(proto);

    expect(hasUsablePresenceApi({ Presence: inherited })).toBe(false);
  });

  it('returns false when Presence itself is only inherited from the prototype chain', () => {
    const proto = { Presence: { store: new Map(), listen: () => undefined } };
    const moduleWithInheritedPresence = Object.create(proto);

    expect(hasUsablePresenceApi(moduleWithInheritedPresence)).toBe(false);
  });
});
