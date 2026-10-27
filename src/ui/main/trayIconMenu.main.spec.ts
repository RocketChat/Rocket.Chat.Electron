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
  statusExpiresAt?: string;
  availableStatuses?: ('online' | 'away' | 'busy' | 'offline')[];
  customStatuses?: {
    id: string;
    name: string;
    status: 'online' | 'away' | 'busy' | 'offline';
  }[];
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

  it('keeps the current presence checked when the user has a status message', () => {
    const template = buildMenuTemplate(
      baseState({
        hasServers: true,
        url: 'https://server.test',
        presence: 'online',
        statusText: 'WFH',
        connection: 'connected',
        loggedIn: true,
        supported: true,
      })
    );

    const radios = findPresenceRootItem(template).submenu.filter(
      (item: any) => item.type === 'radio'
    );
    expect(radios.map((item: any) => item.checked)).toEqual([
      true,
      false,
      false,
      false,
    ]);
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

  describe('with presence reported by the web client', () => {
    const connectedPresence = {
      hasServers: true,
      url: 'https://server.test',
      connection: 'connected' as const,
      loggedIn: true,
      supported: true,
    };

    it('offers only the statuses the user can select', () => {
      const template = buildMenuTemplate(
        baseState({
          ...connectedPresence,
          presence: 'online',
          availableStatuses: ['online', 'away', 'busy'],
        })
      );

      const rootItem = findPresenceRootItem(template);
      expect(rootItem.submenu.map((item: any) => item.label)).toEqual([
        'tray.presence.online',
        'tray.presence.away',
        'tray.presence.busy',
      ]);
    });

    it('marks the active custom status, not a preset, and shows when it ends', () => {
      const template = buildMenuTemplate(
        baseState({
          ...connectedPresence,
          presence: 'busy',
          statusText: 'In a meeting',
          statusExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          customStatuses: [
            { id: 'meeting', name: 'In a meeting', status: 'busy' },
            { id: 'lunch', name: 'Lunch', status: 'away' },
          ],
        })
      );

      const { submenu } = findPresenceRootItem(template);
      expect(submenu.slice(0, 4).some((item: any) => item.checked)).toBe(false);
      expect(findItem(template, 'tray.presence.expiresAt')).toMatchObject({
        enabled: false,
      });

      const customItems = submenu.slice(-2);
      expect(customItems).toMatchObject([
        { label: 'In a meeting', type: 'radio', checked: true },
        { label: 'Lunch', type: 'radio', checked: false },
      ]);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { select } = require('../../store');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { webContents } = require('electron');
      const send = jest.fn();
      select.mockReturnValueOnce({
        url: 'https://server.test',
        webContentsId: 7,
      });
      webContents.fromId.mockReturnValueOnce({ send });

      customItems[1].click();

      expect(send).toHaveBeenCalledWith(
        'presence/change-requested',
        'away',
        undefined,
        'lunch'
      );
    });

    it('does not mark a custom status that only shares its name with the status message', () => {
      const template = buildMenuTemplate(
        baseState({
          ...connectedPresence,
          presence: 'online',
          statusText: 'Lunch',
          customStatuses: [{ id: 'lunch', name: 'Lunch', status: 'away' }],
        })
      );

      const { submenu } = findPresenceRootItem(template);
      expect(
        submenu
          .filter((item: any) => item.type === 'radio')
          .map((item: any) => [item.label, item.checked])
      ).toEqual([
        ['tray.presence.online', true],
        ['tray.presence.away', false],
        ['tray.presence.busy', false],
        ['tray.presence.offline', false],
        ['Lunch', false],
      ]);
    });

    // Electron puts consecutive radio items in one group, and a separator
    // starts a new group. When a menu opens, Electron checks the first item
    // of each group that has no checked item (macOS and Windows).
    const radioGroups = (items: any[]) =>
      items.reduce<any[][]>(
        (groups, item, index) => {
          if (item.type === 'separator') {
            groups.push([]);
          } else if (item.type === 'radio') {
            groups[groups.length - 1].push(item);
          }
          return index === items.length - 1
            ? groups.filter((group) => group.length > 0)
            : groups;
        },
        [[]]
      );

    it.each([
      ['a standard status', { presence: 'online' as const }],
      ['a custom status', { presence: 'away' as const, statusText: 'Lunch' }],
      [
        'a status message that is not a custom status',
        { presence: 'busy' as const, statusText: 'WFH' },
      ],
    ])(
      'gives the status radios exactly one checked item with %s',
      (_case, presence) => {
        const template = buildMenuTemplate(
          baseState({
            ...connectedPresence,
            ...presence,
            customStatuses: [
              { id: 'meeting', name: 'In a meeting', status: 'busy' },
              { id: 'lunch', name: 'Lunch', status: 'away' },
            ],
          })
        );

        const { submenu } = findPresenceRootItem(template);
        const groups = radioGroups(submenu);
        expect(groups).toHaveLength(1);
        expect(
          groups[0].filter((item: any) => item.checked).map((i: any) => i.label)
        ).toHaveLength(1);
      }
    );

    it('hides the end time of a status that already expired', () => {
      const template = buildMenuTemplate(
        baseState({
          ...connectedPresence,
          presence: 'busy',
          statusText: 'In a meeting',
          statusExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
        })
      );

      expect(findItem(template, 'tray.presence.expiresAt')).toBeUndefined();
    });

    it('disables the status item when no status can be selected', () => {
      const template = buildMenuTemplate(
        baseState({
          ...connectedPresence,
          presence: 'online',
          availableStatuses: [],
        })
      );

      expect(findPresenceRootItem(template)).toBeUndefined();
      expect(findItem(template, 'tray.presence.online')).toMatchObject({
        enabled: false,
      });
    });
  });
});
