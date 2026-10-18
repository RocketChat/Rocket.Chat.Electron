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
  isSpellCheckerEnabled: jest.fn(() => true),
});

// On Windows and Linux, Electron's setSpellCheckerLanguages turns spell check
// on when the list is not empty, and off when it is empty.
const emulateElectronSession = (
  target: {
    setSpellCheckerLanguages: jest.Mock;
    setSpellCheckerEnabled: jest.Mock;
    isSpellCheckerEnabled: jest.Mock;
  },
  initiallyEnabled: boolean
) => {
  let enabled = initiallyEnabled;
  target.isSpellCheckerEnabled.mockImplementation(() => enabled);
  target.setSpellCheckerEnabled.mockImplementation((value: boolean) => {
    enabled = value;
  });
  target.setSpellCheckerLanguages.mockImplementation((languages: string[]) => {
    enabled = languages.length > 0;
  });
};

const defaultSessionMock = session.defaultSession as unknown as {
  setSpellCheckerLanguages: jest.Mock;
  setSpellCheckerEnabled: jest.Mock;
  isSpellCheckerEnabled: jest.Mock;
};

const getListener = (type: string) =>
  (listen as jest.Mock).mock.calls.find(
    ([actionType]) => actionType === type
  )?.[1];

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('setupSpellChecking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultSessionMock.setSpellCheckerLanguages.mockImplementation(() => {});
    defaultSessionMock.setSpellCheckerEnabled.mockImplementation(() => {});
    defaultSessionMock.isSpellCheckerEnabled.mockImplementation(() => true);
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([]);
  });

  it('keeps spell check off at startup when the user turned it off', async () => {
    const serverSession = createSession();
    emulateElectronSession(defaultSessionMock, false);
    emulateElectronSession(serverSession, false);
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([
      { session: serverSession },
    ]);

    await setupSpellChecking();
    await flush();

    expect(defaultSessionMock.setSpellCheckerLanguages).toHaveBeenCalledWith([
      'en-US',
    ]);
    expect(defaultSessionMock.isSpellCheckerEnabled()).toBe(false);
    expect(serverSession.isSpellCheckerEnabled()).toBe(false);
  });

  it('keeps spell check on at startup when it was on', async () => {
    emulateElectronSession(defaultSessionMock, true);

    await setupSpellChecking();
    await flush();

    expect(defaultSessionMock.isSpellCheckerEnabled()).toBe(true);
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

  it('changes the languages of a server session that has no webContents at the moment', async () => {
    (webContents.getAllWebContents as jest.Mock).mockReturnValue([]);
    await setupSpellChecking();

    const onSessionCreated = (app.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'session-created'
    )?.[1];
    const idleSession = createSession();
    onSessionCreated(idleSession);

    getListener(SPELL_CHECKING_LANGUAGE_TOGGLED)({
      type: SPELL_CHECKING_LANGUAGE_TOGGLED,
      payload: { name: 'en-US', enabled: false },
    });
    await flush();

    expect(idleSession.setSpellCheckerLanguages).toHaveBeenLastCalledWith([]);
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
