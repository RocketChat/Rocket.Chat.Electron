import { EventEmitter } from 'events';

import type { DownloadItem, WebContents } from 'electron';
import { app, webContents } from 'electron';

import { handleWillDownloadEvent } from '../main';
import { setupElectronDlWithTracking } from './setup';

jest.mock('electron', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventEmitter: Emitter } = require('events');
  const mockApp = new Emitter();
  mockApp.getPath = jest.fn(() => '/Users/test/Downloads');
  return {
    app: mockApp,
    webContents: { getAllWebContents: jest.fn(() => []) },
  };
});

// Same registration order as electron-dl 4: a `session-created` handler that
// adds a `will-download` listener, which calls `onStarted(item)` only.
jest.mock('electron-dl', () =>
  jest.fn((options: { onStarted: (item: unknown) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app: electronApp } = require('electron');
    electronApp.on('session-created', (session: EventEmitter) => {
      session.on('will-download', (_event: unknown, item: unknown) => {
        options.onStarted(item);
      });
    });
  })
);

jest.mock('electron-store', () =>
  jest.fn(() => ({ get: jest.fn(), set: jest.fn() }))
);

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  statSync: jest.fn(() => ({ isDirectory: () => true })),
}));

jest.mock('../main', () => ({
  handleWillDownloadEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('i18next', () => ({ t: jest.fn((key: string) => key) }));

jest.mock('../../notifications/preload', () => ({
  createNotification: jest.fn(),
}));

const fakeWebContents = (id: number) =>
  ({ id, isDestroyed: () => false }) as unknown as WebContents;

const fakeItem = (filename: string) =>
  ({
    getFilename: () => filename,
    setSaveDialogOptions: jest.fn(),
  }) as unknown as DownloadItem;

describe('download source workspace (CORE-2779)', () => {
  const rootWindow = fakeWebContents(1);
  const workspaceA = fakeWebContents(2);
  const workspaceB = fakeWebContents(3);

  beforeAll(() => {
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([
      rootWindow,
      workspaceA,
      workspaceB,
    ]);
    setupElectronDlWithTracking();
  });

  beforeEach(() => {
    (handleWillDownloadEvent as jest.Mock).mockClear();
  });

  it('credits each download to the webContents that started it', () => {
    const sessionA = new EventEmitter();
    const sessionB = new EventEmitter();
    app.emit('session-created', sessionA);
    app.emit('session-created', sessionB);

    const fromB = fakeItem('from-b.pdf');
    sessionB.emit('will-download', {}, fromB, workspaceB);
    const fromA = fakeItem('from-a.pdf');
    sessionA.emit('will-download', {}, fromA, workspaceA);

    const { calls } = (handleWillDownloadEvent as jest.Mock).mock;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe(fromB);
    expect(calls[0][2]).toBe(workspaceB);
    expect(calls[1][1]).toBe(fromA);
    expect(calls[1][2]).toBe(workspaceA);
  });

  it('does not credit a download to the root window', () => {
    const session = new EventEmitter();
    app.emit('session-created', session);

    session.emit('will-download', {}, fakeItem('only.pdf'), workspaceA);

    const { calls } = (handleWillDownloadEvent as jest.Mock).mock;
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).not.toBe(rootWindow);
  });
});
