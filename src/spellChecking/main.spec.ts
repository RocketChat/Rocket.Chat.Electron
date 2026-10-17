import { app, session, webContents } from 'electron';

import { listen } from '../store';
import {
  SPELL_CHECKING_LANGUAGE_TOGGLED,
  SPELL_CHECKING_TOGGLED,
} from './actions';
import { setupSpellChecking } from './main';

jest.mock('../store', () => ({
  listen: jest.fn(),
}));

jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn(async () => undefined),
    on: jest.fn(),
  },
  session: {
    defaultSession: {
      availableSpellCheckerLanguages: ['en-US'],
      setSpellCheckerLanguages: jest.fn(),
      getSpellCheckerLanguages: jest.fn(() => ['en-US']),
      setSpellCheckerEnabled: jest.fn(),
      isSpellCheckerEnabled: jest.fn(() => true),
    },
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
  },
}));

const createSession = () => ({
  setSpellCheckerLanguages: jest.fn(),
  setSpellCheckerEnabled: jest.fn(),
});

const getListener = (type: string) =>
  (listen as jest.Mock).mock.calls.find(
    ([actionType]) => actionType === type
  )?.[1];

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('setupSpellChecking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores languages that the session does not support', async () => {
    await setupSpellChecking();
    getListener(SPELL_CHECKING_LANGUAGE_TOGGLED)({
      type: SPELL_CHECKING_LANGUAGE_TOGGLED,
      payload: { name: 'wtf', enabled: true },
    });
    await flush();

    expect(
      session.defaultSession.setSpellCheckerLanguages
    ).toHaveBeenLastCalledWith(['en-US']);
  });

  it('turns spell check off in every session, and keeps the languages', async () => {
    const serverSession = createSession();
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([
      { session: serverSession },
    ]);

    await setupSpellChecking();
    (session.defaultSession.setSpellCheckerLanguages as jest.Mock).mockClear();
    serverSession.setSpellCheckerLanguages.mockClear();

    getListener(SPELL_CHECKING_TOGGLED)({
      type: SPELL_CHECKING_TOGGLED,
      payload: false,
    });
    await flush();

    expect(session.defaultSession.setSpellCheckerEnabled).toHaveBeenCalledWith(
      false
    );
    expect(serverSession.setSpellCheckerEnabled).toHaveBeenCalledWith(false);
    expect(
      session.defaultSession.setSpellCheckerLanguages
    ).not.toHaveBeenCalled();
    expect(serverSession.setSpellCheckerLanguages).not.toHaveBeenCalled();
  });

  it('toggles a server session that has no webContents at the moment', async () => {
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([]);
    await setupSpellChecking();

    const onSessionCreated = (app.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'session-created'
    )?.[1];
    const idleSession = createSession();
    onSessionCreated(idleSession);
    idleSession.setSpellCheckerEnabled.mockClear();

    getListener(SPELL_CHECKING_TOGGLED)({
      type: SPELL_CHECKING_TOGGLED,
      payload: false,
    });
    await flush();

    expect(idleSession.setSpellCheckerEnabled).toHaveBeenCalledWith(false);
  });

  it('applies the current on/off state to sessions created later', async () => {
    (session.defaultSession.isSpellCheckerEnabled as jest.Mock).mockReturnValue(
      false
    );
    await setupSpellChecking();

    const onSessionCreated = (app.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'session-created'
    )?.[1];
    const newSession = createSession();
    onSessionCreated(newSession);

    expect(newSession.setSpellCheckerEnabled).toHaveBeenCalledWith(false);
  });
});
