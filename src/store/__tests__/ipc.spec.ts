import type { WebContents } from 'electron';
import type { MiddlewareAPI } from 'redux';

import { forwardToMain, forwardToRenderers, getInitialState } from '../ipc';

const mainHandlers: Record<string, (...args: any[]) => any> = {};
const rendererHandlers: Record<string, (...args: any[]) => any> = {};

const invokeFromMainMock = jest.fn();
const invokeFromRendererMock = jest.fn();

jest.mock('../../ipc/main', () => ({
  handle: jest.fn((channel: string, handler: (...args: any[]) => any) => {
    mainHandlers[channel] = handler;
  }),
  invoke: (...args: any[]) => invokeFromMainMock(...args),
}));

jest.mock('../../ipc/renderer', () => ({
  handle: jest.fn((channel: string, handler: (...args: any[]) => any) => {
    rendererHandlers[channel] = handler;
  }),
  invoke: (...args: any[]) => invokeFromRendererMock(...args),
}));

const createApi = (): MiddlewareAPI =>
  ({
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
  }) as unknown as MiddlewareAPI;

describe('store/ipc', () => {
  beforeEach(() => {
    Object.keys(mainHandlers).forEach(
      (channel) => delete mainHandlers[channel]
    );
    Object.keys(rendererHandlers).forEach(
      (channel) => delete rendererHandlers[channel]
    );
    invokeFromMainMock.mockClear();
    invokeFromRendererMock.mockClear();
    jest.clearAllMocks();
  });

  it('registers initial-state handlers and removes renderers on destroy', async () => {
    const next = jest.fn((_action) => _action);
    const middleware = forwardToRenderers(createApi())(next);

    let destroyedListener: (() => void) | undefined;
    const webContents = {
      id: 11,
      addListener: jest.fn((_event, callback: () => void) => {
        destroyedListener = callback;
      }),
    } as unknown as WebContents;

    const state = await mainHandlers['redux/get-initial-state'](webContents);

    expect(state).toEqual({});
    expect(webContents.addListener).toHaveBeenCalledWith(
      'destroyed',
      expect.any(Function)
    );

    middleware({ type: 'BROADCAST' } as any);
    expect(invokeFromMainMock).toHaveBeenCalledTimes(1);

    destroyedListener?.();
    middleware({ type: 'BROADCAST' } as any);
    expect(invokeFromMainMock).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('dispatches actions from main IPC with webContents host metadata and action IPC precedence', async () => {
    const api = createApi();
    forwardToRenderers(api)(jest.fn((_action) => _action));

    const source = {
      id: 7,
      hostWebContents: { id: 101 },
    } as unknown as WebContents;

    await mainHandlers['redux/action-dispatched'](source, {
      type: 'PING',
      payload: { value: 1 },
      ipcMeta: { scope: 'single', webContentsId: 1 },
      meta: { test: true },
    } as any);

    expect(api.dispatch).toHaveBeenCalledWith({
      type: 'PING',
      payload: { value: 1 },
      ipcMeta: {
        webContentsId: 1,
        viewInstanceId: 101,
        scope: 'single',
      },
      meta: { test: true },
    });
  });

  it('forwards non-FSA actions unchanged and skips IPC fan-out', async () => {
    const middleware = forwardToRenderers(createApi())(
      jest.fn((_action) => _action)
    );

    middleware({ type: 42 } as any);

    expect(invokeFromMainMock).not.toHaveBeenCalled();
    await Promise.resolve();
  });

  it('forwards local-scoped actions only to next', () => {
    const next = jest.fn((_action) => _action);
    const chain = forwardToRenderers(createApi())(next);

    chain({
      type: 'LOCAL',
      meta: { scope: 'local' },
    } as any);

    expect(next).toHaveBeenCalledWith({
      type: 'LOCAL',
      meta: { scope: 'local' },
    });
    expect(invokeFromMainMock).not.toHaveBeenCalled();
  });

  it('forwards single-scope actions only to matching renderers', async () => {
    const next = jest.fn((_action) => _action);
    const middleware = forwardToRenderers(createApi())(next);

    const matching = {
      id: 200,
      addListener: jest.fn(),
    } as unknown as WebContents;
    const ignored = {
      id: 201,
      addListener: jest.fn(),
    } as unknown as WebContents;

    await mainHandlers['redux/get-initial-state'](matching);
    await mainHandlers['redux/get-initial-state'](ignored);

    middleware({
      type: 'SINGLE',
      ipcMeta: { scope: 'single', webContentsId: 200 },
    } as any);

    expect(invokeFromMainMock).toHaveBeenCalledTimes(1);
    expect(invokeFromMainMock).toHaveBeenCalledWith(
      matching,
      'redux/action-dispatched',
      expect.objectContaining({
        type: 'SINGLE',
        meta: { scope: 'local' },
        ipcMeta: { scope: 'single', webContentsId: 200 },
      })
    );
    expect(next).toHaveBeenCalledWith({
      type: 'SINGLE',
      ipcMeta: { scope: 'single', webContentsId: 200 },
    });
  });

  it('forwards non-single actions to all renderers', async () => {
    const next = jest.fn((_action) => _action);
    const middleware = forwardToRenderers(createApi())(next);

    const first = {
      id: 300,
      addListener: jest.fn(),
    } as unknown as WebContents;
    const second = {
      id: 301,
      addListener: jest.fn(),
    } as unknown as WebContents;

    await mainHandlers['redux/get-initial-state'](first);
    await mainHandlers['redux/get-initial-state'](second);

    middleware({
      type: 'BROADCAST',
      meta: { source: 'unit' },
    } as any);

    expect(invokeFromMainMock).toHaveBeenCalledTimes(2);
    expect(invokeFromMainMock).toHaveBeenNthCalledWith(
      1,
      first,
      'redux/action-dispatched',
      expect.objectContaining({
        type: 'BROADCAST',
        meta: { source: 'unit', scope: 'local' },
      })
    );
    expect(invokeFromMainMock).toHaveBeenNthCalledWith(
      2,
      second,
      'redux/action-dispatched',
      expect.objectContaining({
        type: 'BROADCAST',
        meta: { source: 'unit', scope: 'local' },
      })
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('forwards single-scope actions to view-instance ids', async () => {
    const middleware = forwardToRenderers(createApi())(
      jest.fn((_action) => _action)
    );
    const matching = {
      id: 200,
      addListener: jest.fn(),
    } as unknown as WebContents;
    const byView = {
      id: 901,
      addListener: jest.fn(),
    } as unknown as WebContents;

    await mainHandlers['redux/get-initial-state'](matching);
    await mainHandlers['redux/get-initial-state'](byView);

    middleware({
      type: 'SINGLE_VIEW',
      ipcMeta: { scope: 'single', webContentsId: 999, viewInstanceId: 901 },
    } as any);

    expect(invokeFromMainMock).toHaveBeenCalledTimes(1);
    expect(invokeFromMainMock).toHaveBeenCalledWith(
      byView,
      'redux/action-dispatched',
      expect.objectContaining({
        type: 'SINGLE_VIEW',
        ipcMeta: { scope: 'single', webContentsId: 999, viewInstanceId: 901 },
        meta: { scope: 'local' },
      })
    );
  });

  it('delegates getInitialState to renderer IPC', async () => {
    invokeFromRendererMock.mockResolvedValue({ restored: true });

    await expect(getInitialState()).resolves.toEqual({ restored: true });
    expect(invokeFromRendererMock).toHaveBeenCalledWith(
      'redux/get-initial-state'
    );
  });

  it('dispatches renderer actions when handler receives them', async () => {
    const dispatch = jest.fn();
    const api = {
      dispatch,
      getState: jest.fn(() => ({})),
    } as unknown as MiddlewareAPI;

    forwardToMain(api);

    await rendererHandlers['redux/action-dispatched']({ type: 'X' } as any);

    expect(dispatch).toHaveBeenCalledWith({ type: 'X' });
  });

  it('forwards renderer middleware to IPC for non-local FSA actions', () => {
    const dispatch = jest.fn();
    const middleware = forwardToMain({
      dispatch,
      getState: jest.fn(() => ({})),
    } as unknown as MiddlewareAPI);
    const next = jest.fn((_action) => _action);

    middleware(next)({ type: 'HELLO' } as any);

    expect(invokeFromRendererMock).toHaveBeenCalledWith(
      'redux/action-dispatched',
      { type: 'HELLO' }
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards renderer middleware to next for local-scoped actions', () => {
    const middleware = forwardToMain(createApi());
    const next = jest.fn((_action) => _action);

    middleware(next)({
      type: 'LOCAL',
      meta: { scope: 'local' },
    } as any);

    expect(invokeFromRendererMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
