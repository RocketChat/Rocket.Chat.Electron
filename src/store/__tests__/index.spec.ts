/**
 * Unit tests for the store helpers in src/store/index.ts.
 *
 * The store module keeps a module-level `reduxStore` singleton, so each test
 * group uses `jest.resetModules()` + dynamic `import()` to obtain a fresh
 * module instance with an uninitialized store when needed.
 *
 * The `./ipc` module is mocked so store creation does not touch Electron IPC.
 */
import type { Middleware } from 'redux';

import type * as StoreModuleType from '../index';

type StoreModule = typeof StoreModuleType;

const FORWARD_TO_RENDERERS_MOCK: Middleware = () => (next) => (action) =>
  next(action);
const FORWARD_TO_MAIN_MOCK: Middleware = () => (next) => (action) =>
  next(action);

let getInitialStateMock: jest.Mock;

const loadStoreModule = async (): Promise<StoreModule> => {
  jest.resetModules();
  getInitialStateMock = jest.fn(async () => ({}));

  jest.doMock('../ipc', () => ({
    forwardToRenderers: FORWARD_TO_RENDERERS_MOCK,
    forwardToMain: FORWARD_TO_MAIN_MOCK,
    getInitialState: getInitialStateMock,
  }));

  return import('../index');
};

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

describe('store/index', () => {
  describe('before the store is initialized', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
    });

    it('dispatch is a no-op', () => {
      expect(() => store.dispatch({ type: 'ANY_ACTION' } as any)).not.toThrow();
    });

    it('dispatchSingle is a no-op', () => {
      expect(() =>
        store.dispatchSingle({ type: 'ANY_ACTION' } as any)
      ).not.toThrow();
    });

    it('dispatchLocal is a no-op', () => {
      expect(() =>
        store.dispatchLocal({ type: 'ANY_ACTION' } as any)
      ).not.toThrow();
    });

    it('safeSelect returns undefined', () => {
      expect(store.safeSelect(() => 42)).toBeUndefined();
    });

    it('watch warns, runs nothing, and returns a no-op unsubscribe', () => {
      const warnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const watcher = jest.fn();

      const unsubscribe = store.watch(() => 1, watcher);

      expect(warnSpy).toHaveBeenCalledWith(
        '[store] watch() called before store initialized'
      );
      expect(watcher).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('listen returns a no-op unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = store.listen('SOME_TYPE' as any, listener);
      expect(listener).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });

    it('request rejects when the store is not initialized', async () => {
      await expect(
        store.request({ type: 'SOME_REQUEST' } as any, 'SOME_RESPONSE' as any)
      ).rejects.toThrow('Store not initialized');
    });
  });

  describe('createMainReduxStore', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
    });

    it('creates a store with the initial reducer state', () => {
      expect(store.select((state) => state)).toBeDefined();
      expect(typeof store.select((state) => state)).toBe('object');
    });

    it('dispatch forwards actions to the store', () => {
      expect(() => store.dispatch({ type: 'ANY_ACTION' } as any)).not.toThrow();
    });

    it('safeSelect returns the selected value once initialized', () => {
      const result = store.safeSelect((state) => state);
      expect(result).toBeDefined();
    });
  });

  describe('createRendererReduxStore', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      delete (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    });

    it('hydrates the store from getInitialState and returns it', async () => {
      const created = await store.createRendererReduxStore();

      expect(getInitialStateMock).toHaveBeenCalledTimes(1);
      expect(created).toBeDefined();
      expect(typeof created.getState).toBe('function');
      expect(created.getState()).toBeDefined();
    });

    it('uses the Redux devtools compose enhancer when present', async () => {
      const composeSpy = jest.fn((enhancer: unknown) => enhancer);
      (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = composeSpy;

      await store.createRendererReduxStore();

      expect(composeSpy).toHaveBeenCalledTimes(1);

      delete (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    });
  });

  describe('select / safeSelect after initialization', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
    });

    it('select runs the selector against the current state', () => {
      const selector = jest.fn((state) => state);
      const result = store.select(selector);
      expect(selector).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('safeSelect runs the selector against the current state', () => {
      const selector = jest.fn((state) => state);
      const result = store.safeSelect(selector);
      expect(selector).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('dispatch variants set the expected scope metadata', () => {
    let store: StoreModule;
    let dispatched: any[];

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
      dispatched = [];
      // Capture every dispatched action via a listener-style subscription.
      store.listen(
        ((_action: any): _action is any => true) as any,
        (action) => {
          dispatched.push(action);
        }
      );
    });

    it('dispatchSingle tags ipcMeta.scope as "single"', () => {
      store.dispatchSingle({ type: 'SINGLE_ACTION' } as any);
      const action = dispatched.find((a) => a.type === 'SINGLE_ACTION');
      expect(action).toBeDefined();
      expect(action.ipcMeta.scope).toBe('single');
    });

    it('dispatchLocal tags ipcMeta.scope and meta.scope as "local"', () => {
      store.dispatchLocal({ type: 'LOCAL_ACTION' } as any);
      const action = dispatched.find((a) => a.type === 'LOCAL_ACTION');
      expect(action).toBeDefined();
      expect(action.ipcMeta.scope).toBe('local');
      expect(action.meta.scope).toBe('local');
    });
  });

  describe('watch', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
    });

    it('invokes the watcher immediately with the initial value', () => {
      const watcher = jest.fn();
      store.watch((state) => state, watcher);
      expect(watcher).toHaveBeenCalledTimes(1);
      expect(watcher.mock.calls[0][1]).toBeUndefined();
    });

    it('invokes the watcher when the selected value changes', () => {
      const watcher = jest.fn();
      // Select a value derived from a counter that we mutate via dispatch.
      let toggle = false;
      store.watch(() => toggle, watcher);
      expect(watcher).toHaveBeenCalledTimes(1);

      toggle = true;
      store.dispatch({ type: 'TRIGGER_SUBSCRIPTION' } as any);

      expect(watcher).toHaveBeenCalledTimes(2);
      expect(watcher).toHaveBeenLastCalledWith(true, false);
    });

    it('does not invoke the watcher when the selected value is unchanged', () => {
      const watcher = jest.fn();
      store.watch(() => 'constant', watcher);
      expect(watcher).toHaveBeenCalledTimes(1);

      store.dispatch({ type: 'TRIGGER_SUBSCRIPTION' } as any);

      expect(watcher).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe that stops further watcher calls', () => {
      const watcher = jest.fn();
      let value = 0;
      const unsubscribe = store.watch(() => value, watcher);
      expect(watcher).toHaveBeenCalledTimes(1);

      unsubscribe();
      value = 1;
      store.dispatch({ type: 'TRIGGER_SUBSCRIPTION' } as any);

      expect(watcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('listen', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
    });

    it('invokes the listener when the action type matches', () => {
      const listener = jest.fn();
      store.listen('MATCHING_TYPE' as any, listener);

      store.dispatch({ type: 'MATCHING_TYPE' } as any);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].type).toBe('MATCHING_TYPE');
    });

    it('does not invoke the listener when the action type does not match', () => {
      const listener = jest.fn();
      store.listen('MATCHING_TYPE' as any, listener);

      store.dispatch({ type: 'OTHER_TYPE' } as any);

      expect(listener).not.toHaveBeenCalled();
    });

    it('supports a predicate function instead of a type string', () => {
      const listener = jest.fn();
      store.listen(
        ((action: any): action is any =>
          action.type === 'PREDICATE_HIT') as any,
        listener
      );

      store.dispatch({ type: 'PREDICATE_MISS' } as any);
      expect(listener).not.toHaveBeenCalled();

      store.dispatch({ type: 'PREDICATE_HIT' } as any);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('returns an unsubscribe that stops further listener calls', () => {
      const listener = jest.fn();
      const unsubscribe = store.listen('MATCHING_TYPE' as any, listener);

      unsubscribe();
      store.dispatch({ type: 'MATCHING_TYPE' } as any);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('request', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
    });

    it('resolves with the payload of a matching response action', async () => {
      // Capture the auto-generated request id by listening for the request
      // action that the helper dispatches.
      let requestId: unknown;
      store.listen(
        ((action: any): action is any => action?.meta?.request === true) as any,
        (action: any) => {
          requestId = action.meta.id;
        }
      );

      const promise = store.request(
        { type: 'DO_REQUEST' } as any,
        'DO_RESPONSE' as any
      );

      expect(requestId).toBeDefined();

      store.dispatch({
        type: 'DO_RESPONSE',
        payload: { ok: true },
        meta: { response: true, id: requestId },
      } as any);

      await expect(promise).resolves.toEqual({ ok: true });
    });

    it('rejects with the error payload of an errored response action', async () => {
      let requestId: unknown;
      store.listen(
        ((action: any): action is any => action?.meta?.request === true) as any,
        (action: any) => {
          requestId = action.meta.id;
        }
      );

      const promise = store.request(
        { type: 'ERR_REQUEST' } as any,
        'ERR_RESPONSE' as any
      );

      const failure = new Error('boom');
      store.dispatch({
        type: 'ERR_RESPONSE',
        payload: failure,
        error: true,
        meta: { response: true, id: requestId },
      } as any);

      await expect(promise).rejects.toBe(failure);
    });
  });

  describe('Service', () => {
    let store: StoreModule;

    beforeEach(async () => {
      store = await loadStoreModule();
      store.createMainReduxStore();
    });

    it('setUp calls initialize and tearDown calls destroy', () => {
      const initialize = jest.fn();
      const destroy = jest.fn();

      class TestService extends store.Service {
        protected initialize(): void {
          initialize();
        }

        protected destroy(): void {
          destroy();
        }
      }

      const service = new TestService();
      service.setUp();
      expect(initialize).toHaveBeenCalledTimes(1);

      service.tearDown();
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('registers watchers/listeners on setUp and unsubscribes on tearDown', () => {
      const watcher = jest.fn();
      const listener = jest.fn();

      class TestService extends store.Service {
        protected initialize(): void {
          this.watch((state) => state, watcher);
          this.listen('SERVICE_TYPE' as any, listener);
          this.listen(
            ((action: any): action is any =>
              action.type === 'SERVICE_PREDICATE') as any,
            listener
          );
        }
      }

      const service = new TestService();
      service.setUp();

      // watch fires immediately with the initial value.
      expect(watcher).toHaveBeenCalledTimes(1);

      store.dispatch({ type: 'SERVICE_TYPE' } as any);
      store.dispatch({ type: 'SERVICE_PREDICATE' } as any);
      expect(listener).toHaveBeenCalledTimes(2);

      service.tearDown();

      // After tearDown, no further listener invocations.
      store.dispatch({ type: 'SERVICE_TYPE' } as any);
      store.dispatch({ type: 'SERVICE_PREDICATE' } as any);
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
