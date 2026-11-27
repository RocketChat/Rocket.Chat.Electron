import { ipcRenderer } from 'electron';

import { E2EE_SEARCH_EVENT_CHANNEL } from '../ipc';
import { e2eeSearch } from '../preload';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
  },
}));

const invoke = ipcRenderer.invoke as jest.Mock;
const receive = (ipcRenderer.on as jest.Mock).mock.calls.find(
  ([channel]) => channel === E2EE_SEARCH_EVENT_CHANNEL
)![1] as (_event: unknown, token: string, value: unknown) => void;

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ schemaVersion: 2, encryptedAtRest: true });
});

afterEach(async () => {
  await e2eeSearch.close();
});

it('ignores stale session events and removes page callbacks on unsubscribe and close', async () => {
  await e2eeSearch.open({ userId: 'first' });
  const firstToken = invoke.mock.calls[invoke.mock.calls.length - 1][3];
  const first = jest.fn();
  const unsubscribe = e2eeSearch.onIndexEvent(first);
  receive({}, firstToken, { type: 'changed' });
  expect(first).toHaveBeenCalledTimes(1);
  unsubscribe();
  receive({}, firstToken, { type: 'changed' });
  expect(first).toHaveBeenCalledTimes(1);
  await e2eeSearch.open({ userId: 'second' });
  const secondToken = invoke.mock.calls[invoke.mock.calls.length - 1][3];
  const second = jest.fn();
  e2eeSearch.onIndexEvent(second);
  receive({}, firstToken, { type: 'lost' });
  expect(second).not.toHaveBeenCalled();
  receive({}, secondToken, { type: 'changed' });
  expect(second).toHaveBeenCalledWith({ type: 'changed' });
  await e2eeSearch.close();
  receive({}, secondToken, { type: 'lost' });
  expect(second).toHaveBeenCalledTimes(1);
});

it('delivers an event to remaining listeners when one page callback throws', async () => {
  await e2eeSearch.open({ userId: 'first' });
  const token = invoke.mock.calls[invoke.mock.calls.length - 1][3];
  e2eeSearch.onIndexEvent(() => {
    throw new Error('page callback failed');
  });
  const remaining = jest.fn();
  e2eeSearch.onIndexEvent(remaining);
  expect(() => receive({}, token, { type: 'lost' })).not.toThrow();
  expect(remaining).toHaveBeenCalledWith({ type: 'lost' });
});

it('retains loss received before open resolves for the new session listener', async () => {
  let finish!: (value: unknown) => void;
  invoke.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const opened = e2eeSearch.open({ userId: 'first' });
  const token = invoke.mock.calls[invoke.mock.calls.length - 1][3];
  receive({}, token, { type: 'lost' });
  finish({ schemaVersion: 2, encryptedAtRest: true });
  await opened;
  const listener = jest.fn();
  e2eeSearch.onIndexEvent(listener);
  await Promise.resolve();
  expect(listener).toHaveBeenCalledWith({ type: 'lost' });
});

it('refuses listener registration while locked and ignores malformed events', async () => {
  invoke.mockResolvedValueOnce({
    schemaVersion: 2,
    encryptedAtRest: false,
    locked: true,
  });
  await e2eeSearch.open({ userId: 'first' });
  expect(() => e2eeSearch.onIndexEvent(jest.fn())).toThrow('not open');
  await e2eeSearch.open({ userId: 'first' });
  const token = invoke.mock.calls[invoke.mock.calls.length - 1][3];
  const listener = jest.fn();
  e2eeSearch.onIndexEvent(listener);
  receive({}, token, null);
  receive({}, token, { type: 'untrusted' });
  expect(listener).not.toHaveBeenCalled();
});
