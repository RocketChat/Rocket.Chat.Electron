export {};

jest.mock('i18next', () => ({
  t: (key: string, opts?: { workspace?: string }) =>
    opts?.workspace ? `${key}:${opts.workspace}` : key,
}));

jest.mock('electron', () => ({
  app: {
    name: 'Rocket.Chat',
    quit: jest.fn(),
  },
  Menu: {
    buildFromTemplate: jest.fn((template) => template),
  },
  nativeImage: {
    createEmpty: jest.fn(() => ({})),
    createFromPath: jest.fn(() => ({})),
  },
  Tray: jest.fn(),
  webContents: {
    fromId: jest.fn(() => undefined),
  },
}));

jest.mock('../../store', () => ({
  Service: class Service {},
  select: jest.fn(),
  dispatch: jest.fn(),
  watch: jest.fn(() => jest.fn()),
}));

jest.mock('../selectors', () => ({
  selectGlobalBadge: jest.fn(),
  selectActiveServerPresence: jest.fn(),
}));

jest.mock('./icons', () => ({
  getTrayIconPath: jest.fn(() => '/icon.png'),
  getAppIconPath: jest.fn(() => '/app.png'),
  getPresenceMenuIconPath: jest.fn(
    (presence: string) => `/presence/${presence}.png`
  ),
}));

jest.mock('./rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const trayIconModule = require('./trayIcon');

type ActiveServerPresence = {
  url?: string;
  title?: string;
  presence?: 'online' | 'away' | 'busy' | 'offline';
  statusText?: string;
  connection?: 'connected' | 'connecting' | 'disconnected';
  supported?: boolean;
  loggedIn?: boolean;
  failed?: boolean;
  hasServers: boolean;
  isAddingServer?: boolean;
};

const baseState = (
  activeServerPresence: ActiveServerPresence,
  isRootWindowVisible = true
) => ({ isRootWindowVisible, activeServerPresence });

const buildMenuTemplate = (state: {
  isRootWindowVisible: boolean;
  activeServerPresence: ActiveServerPresence;
}): any[] => trayIconModule.buildMenuTemplate(state);

const findItem = (template: any[], labelIncludes: string) =>
  template.find(
    (item) =>
      typeof item.label === 'string' && item.label.includes(labelIncludes)
  );

describe('ui/main/trayIcon buildMenuTemplate', () => {
  it('always includes Show/Hide and Quit', () => {
    const template = buildMenuTemplate(baseState({ hasServers: false }));

    expect(findItem(template, 'tray.menu.hide')).toBeDefined();
    expect(findItem(template, 'tray.menu.quit')).toBeDefined();
  });

  it('shows label as Show when root window is not visible', () => {
    const template = buildMenuTemplate(baseState({ hasServers: false }, false));

    expect(findItem(template, 'tray.menu.show')).toBeDefined();
  });

  const findPresenceRootItem = (template: any[]) =>
    template.find((item) => Array.isArray(item.submenu));

  it('shows the current presence as the top-level label/icon and four radios in the submenu when connected', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        title: 'My Server',
        presence: 'away',
        connection: 'connected',
        loggedIn: true,
        supported: true,
      })
    );

    const rootItem = findPresenceRootItem(template);
    expect(rootItem).toBeDefined();
    expect(rootItem.label).toBe('tray.presence.away');
    expect(rootItem.icon).toBeDefined();

    const radios = rootItem.submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios).toHaveLength(4);
    expect(radios.map((item: any) => item.checked)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    radios.forEach((item: any) => {
      expect(item.enabled).toBe(true);
      expect(item.icon).toBeDefined();
    });
  });

  it('disables submenu radios and shows a disconnected line when connecting', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        connection: 'connecting',
        loggedIn: true,
        supported: true,
      })
    );

    const rootItem = findPresenceRootItem(template);
    const radios = rootItem.submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios).toHaveLength(4);
    radios.forEach((item: any) => expect(item.enabled).toBe(false));

    expect(findItem(template, 'tray.presence.disconnected')).toBeDefined();
  });

  it('disables submenu radios and shows a disconnected line when disconnected', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        connection: 'disconnected',
        loggedIn: true,
        supported: true,
      })
    );

    const rootItem = findPresenceRootItem(template);
    const radios = rootItem.submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios).toHaveLength(4);
    radios.forEach((item: any) => expect(item.enabled).toBe(false));

    expect(findItem(template, 'tray.presence.disconnected')).toBeDefined();
  });

  it('disables submenu radios and shows a disconnected line when presence disconnection is simulated (connection forced to disconnected while otherwise connected)', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        // Mirrors what selectActiveServerPresence returns when
        // isPresenceDisconnectionSimulated overrides a real 'connected' value.
        connection: 'disconnected',
        loggedIn: true,
        supported: true,
      })
    );

    const rootItem = findPresenceRootItem(template);
    const radios = rootItem.submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios).toHaveLength(4);
    radios.forEach((item: any) => expect(item.enabled).toBe(false));

    expect(findItem(template, 'tray.presence.disconnected')).toBeDefined();
  });

  it('enables submenu radios and shows no disconnected line when connection is not yet known (fresh boot)', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'away',
        connection: undefined,
        loggedIn: true,
        supported: true,
      })
    );

    const rootItem = findPresenceRootItem(template);
    const radios = rootItem.submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios).toHaveLength(4);
    radios.forEach((item: any) => expect(item.enabled).toBe(true));

    expect(findItem(template, 'tray.presence.disconnected')).toBeUndefined();
  });

  it('labels the top-level item with the neutral status label and no icon, with none checked in the submenu, when presence and connection are both not yet known', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: undefined,
        connection: undefined,
        loggedIn: true,
        supported: true,
      })
    );

    const rootItem = findPresenceRootItem(template);
    expect(rootItem.label).toBe('tray.presence.status');
    expect(rootItem.icon).toBeUndefined();

    const radios = rootItem.submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios).toHaveLength(4);
    radios.forEach((item: any) => expect(item.checked).toBe(false));
  });

  it('shows a disabled custom status line when statusText is set', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        statusText: 'Out for lunch',
        connection: 'connected',
        loggedIn: true,
        supported: true,
      })
    );

    const statusItem = findItem(template, 'Out for lunch');
    expect(statusItem).toBeDefined();
    expect(statusItem.enabled).toBe(false);
  });

  it('omits the custom status line when statusText is empty', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        statusText: '',
        connection: 'connected',
        loggedIn: true,
        supported: true,
      })
    );

    expect(template.some((item) => item.label === '')).toBe(false);
  });

  it('shows a Sign in item and no radios when logged out', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        title: 'My Server',
        loggedIn: false,
        supported: true,
      })
    );

    const radios = template.filter((item) => item.type === 'radio');
    expect(radios).toHaveLength(0);
    expect(findItem(template, 'tray.presence.signIn:My Server')).toBeDefined();
  });

  it('shows an Add workspace item and no radios when there are no servers', () => {
    const template = buildMenuTemplate(baseState({ hasServers: false }));

    const radios = template.filter((item) => item.type === 'radio');
    expect(radios).toHaveLength(0);
    expect(findItem(template, 'tray.presence.addWorkspace')).toBeDefined();
  });

  it('shows an Add workspace item and no radios when on the add-workspace screen with existing servers', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        isAddingServer: true,
        url: 'https://server.test',
        presence: 'online',
        connection: 'connected',
        loggedIn: true,
        supported: true,
      })
    );

    const radios = template.filter((item) => item.type === 'radio');
    expect(radios).toHaveLength(0);
    expect(findItem(template, 'tray.presence.addWorkspace')).toBeDefined();
  });

  it('hides presence items entirely when unsupported', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        statusText: 'Some status',
        connection: 'connected',
        loggedIn: true,
        supported: false,
      })
    );

    const radios = template.filter((item) => item.type === 'radio');
    expect(radios).toHaveLength(0);
    expect(template.some((item) => item.label === 'Some status')).toBe(false);
    expect(findItem(template, 'tray.presence.signIn')).toBeUndefined();
    expect(findItem(template, 'tray.presence.addWorkspace')).toBeUndefined();
    expect(findItem(template, 'tray.menu.hide')).toBeDefined();
    expect(findItem(template, 'tray.menu.quit')).toBeDefined();
  });

  it('hides presence items entirely when the active server failed to load', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        statusText: 'Some status',
        connection: 'connected',
        loggedIn: true,
        supported: true,
        failed: true,
      })
    );

    expect(findPresenceRootItem(template)).toBeUndefined();
    const radios = template.filter((item) => item.type === 'radio');
    expect(radios).toHaveLength(0);
    expect(template.some((item) => item.label === 'Some status')).toBe(false);
    expect(findItem(template, 'tray.presence.signIn')).toBeUndefined();
    expect(findItem(template, 'tray.presence.addWorkspace')).toBeUndefined();
    expect(findItem(template, 'tray.menu.hide')).toBeDefined();
    expect(findItem(template, 'tray.menu.quit')).toBeDefined();
  });

  it('shows a Sign in item when logged out and unsupported', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        title: 'My Server',
        loggedIn: false,
        supported: false,
      })
    );

    const radios = template.filter((item) => item.type === 'radio');
    expect(radios).toHaveLength(0);
    expect(findItem(template, 'tray.presence.signIn:My Server')).toBeDefined();
  });
});
