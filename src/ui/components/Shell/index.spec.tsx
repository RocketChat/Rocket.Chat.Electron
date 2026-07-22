import { Shell } from '.';
import { renderWithStore, screen } from '../../test-utils';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// Shell is a top-level layout that mounts every view and dialog (webviews,
// portals, IPC-backed effects). We stub each child to a marker node so the test
// exercises Shell's OWN logic — selectors, the theme effect, the appPath
// stylesheet effect and the conditional layout — without dragging in the heavy
// subtrees. TooltipProvider is kept as a passthrough so its children render.
jest.mock('../utils/TooltipProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='tooltip-provider'>{children}</div>
  ),
}));

jest.mock('../ServersView', () => ({
  __esModule: true,
  ServersView: () => <div data-testid='servers-view' />,
}));

jest.mock('../AddServerView', () => ({
  __esModule: true,
  AddServerView: () => <div data-testid='add-server-view' />,
}));

jest.mock('../DownloadsManagerView', () => ({
  __esModule: true,
  default: () => <div data-testid='downloads-manager-view' />,
}));

jest.mock('../SettingsView', () => ({
  __esModule: true,
  SettingsView: () => <div data-testid='settings-view' />,
}));

jest.mock('../TopBar', () => ({
  __esModule: true,
  TopBar: () => <div data-testid='top-bar' />,
}));

jest.mock('../TabBar', () => ({
  __esModule: true,
  TabBar: ({
    leadingSlot,
    trailingSlot,
    orientation = 'horizontal',
  }: {
    leadingSlot?: React.ReactNode;
    trailingSlot?: React.ReactNode;
    orientation?: 'horizontal' | 'vertical';
  }) => (
    <div data-testid='tab-bar' data-orientation={orientation}>
      {leadingSlot}
      {trailingSlot}
    </div>
  ),
}));

jest.mock('../TabBar/MeatballMenuButton', () => ({
  __esModule: true,
  MeatballMenuButton: () => <div data-testid='meatball-menu-button' />,
}));

jest.mock('../TabBar/WindowControls', () => ({
  __esModule: true,
  WindowControls: () => <div data-testid='window-controls' />,
}));

jest.mock('../TabBar/WindowsTitleBar', () => ({
  __esModule: true,
  WindowsTitleBar: () => <div data-testid='windows-title-bar' />,
}));

jest.mock('../AboutDialog', () => ({
  __esModule: true,
  AboutDialog: () => <div data-testid='about-dialog' />,
}));

jest.mock('../ServerInfoModal', () => ({
  __esModule: true,
  ServerInfoModal: () => <div data-testid='server-info-modal' />,
}));

jest.mock('../SupportedVersionDialog', () => ({
  __esModule: true,
  SupportedVersionDialog: () => <div data-testid='supported-version-dialog' />,
}));

jest.mock('../ScreenSharingDialog', () => ({
  __esModule: true,
  ScreenSharingDialog: () => <div data-testid='screen-sharing-dialog' />,
}));

jest.mock('../RootScreenSharePicker', () => ({
  __esModule: true,
  RootScreenSharePicker: () => <div data-testid='root-screen-share-picker' />,
}));

jest.mock('../SelectClientCertificateDialog', () => ({
  __esModule: true,
  SelectClientCertificateDialog: () => (
    <div data-testid='select-client-certificate-dialog' />
  ),
}));

jest.mock('../UpdateDialog', () => ({
  __esModule: true,
  UpdateDialog: () => <div data-testid='update-dialog' />,
}));

jest.mock('../ClearCacheDialog', () => ({
  __esModule: true,
  ClearCacheDialog: () => <div data-testid='clear-cache-dialog' />,
}));

jest.mock('../OutlookCredentialsDialog', () => ({
  __esModule: true,
  OutlookCredentialsDialog: () => (
    <div data-testid='outlook-credentials-dialog' />
  ),
}));

// PaletteStyleTag / GlobalStyles / WindowDragBar emit raw <style>/<link> tags
// and palette CSS that are noise for these assertions. Reduce them to markers.
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage');
  return {
    __esModule: true,
    ...actual,
    PaletteStyleTag: ({ theme }: { theme?: string }) => (
      <div data-testid='palette-style-tag' data-theme={theme} />
    ),
  };
});

jest.mock('./styles', () => ({
  __esModule: true,
  GlobalStyles: ({
    isTransparentWindowEnabled,
  }: {
    isTransparentWindowEnabled?: boolean;
  }) => (
    <div
      data-testid='global-styles'
      data-transparent={String(!!isTransparentWindowEnabled)}
    />
  ),
  WindowDragBar: () => <div data-testid='window-drag-bar' />,
}));

const buildState = (overrides: Record<string, unknown> = {}) =>
  ({
    appPath: '/app',
    machineTheme: 'light',
    userThemePreference: 'auto',
    isTransparentWindowEnabled: false,
    navigationLayout: 'sidebar',
    ...overrides,
  }) as any;

const setPlatform = (platform: NodeJS.Platform): (() => void) => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
  return () =>
    Object.defineProperty(process, 'platform', {
      value: original,
      configurable: true,
    });
};

describe('Shell', () => {
  it('renders the layout and its primary views without crashing', () => {
    renderWithStore(<Shell />, { preloadedState: buildState() });

    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    expect(screen.getByTestId('servers-view')).toBeInTheDocument();
    expect(screen.getByTestId('add-server-view')).toBeInTheDocument();
    expect(screen.getByTestId('downloads-manager-view')).toBeInTheDocument();
    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
  });

  it('mounts the top-level dialogs', () => {
    renderWithStore(<Shell />, { preloadedState: buildState() });

    expect(screen.getByTestId('about-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('server-info-modal')).toBeInTheDocument();
    expect(screen.getByTestId('supported-version-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('update-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('clear-cache-dialog')).toBeInTheDocument();
    expect(
      screen.getByTestId('outlook-credentials-dialog')
    ).toBeInTheDocument();
  });

  it('follows the machine theme when the preference is auto (light)', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({
        machineTheme: 'light',
        userThemePreference: 'auto',
      }),
    });

    expect(screen.getByTestId('palette-style-tag')).toHaveAttribute(
      'data-theme',
      'light'
    );
  });

  it('follows the machine theme when the preference is auto (dark)', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({
        machineTheme: 'dark',
        userThemePreference: 'auto',
      }),
    });

    expect(screen.getByTestId('palette-style-tag')).toHaveAttribute(
      'data-theme',
      'dark'
    );
  });

  it('uses the explicit user theme preference over the machine theme', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({
        machineTheme: 'dark',
        userThemePreference: 'light',
      }),
    });

    expect(screen.getByTestId('palette-style-tag')).toHaveAttribute(
      'data-theme',
      'light'
    );
  });

  it('resolves the theme regardless of the transparency setting', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({
        machineTheme: 'light',
        userThemePreference: 'auto',
        isTransparentWindowEnabled: false,
      }),
    });

    expect(screen.getByTestId('palette-style-tag')).toHaveAttribute(
      'data-theme',
      'light'
    );
  });

  it('forwards the transparency flag to the global styles', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({ isTransparentWindowEnabled: true }),
    });

    expect(screen.getByTestId('global-styles')).toHaveAttribute(
      'data-transparent',
      'true'
    );
  });

  it('injects the rocketchat stylesheet link from appPath', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({ appPath: '/app' }),
    });

    const link = document.head.querySelector(
      'link[href="/app/app/icons/rocketchat.css"]'
    );
    expect(link).toBeInTheDocument();
  });

  it('does not inject the stylesheet link when appPath is empty', () => {
    renderWithStore(<Shell />, { preloadedState: buildState({ appPath: '' }) });

    const link = document.head.querySelector(
      'link[href$="/app/icons/rocketchat.css"]'
    );
    expect(link).not.toBeInTheDocument();
  });

  it('renders the sidebar layout (vertical TabBar + meatball menu + TopBar) when navigationLayout is sidebar', () => {
    const restorePlatform = setPlatform('darwin');

    try {
      renderWithStore(<Shell />, {
        preloadedState: buildState({ navigationLayout: 'sidebar' }),
      });

      expect(screen.getByTestId('tab-bar')).toHaveAttribute(
        'data-orientation',
        'vertical'
      );
      expect(screen.getByTestId('meatball-menu-button')).toBeInTheDocument();
      expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    } finally {
      restorePlatform();
    }
  });

  it('renders the tabs layout (horizontal TabBar, no TopBar/WindowDragBar) when navigationLayout is tabs', () => {
    renderWithStore(<Shell />, {
      preloadedState: buildState({ navigationLayout: 'tabs' }),
    });

    expect(screen.getByTestId('tab-bar')).toHaveAttribute(
      'data-orientation',
      'horizontal'
    );
    expect(screen.queryByTestId('top-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('window-drag-bar')).not.toBeInTheDocument();
  });

  describe('win32 chrome', () => {
    let restorePlatform: () => void;

    afterEach(() => {
      restorePlatform?.();
    });

    it('mounts the meatball menu and window controls as TabBar slots when navigationLayout is tabs', () => {
      restorePlatform = setPlatform('win32');

      renderWithStore(<Shell />, {
        preloadedState: buildState({ navigationLayout: 'tabs' }),
      });

      expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
      expect(screen.getByTestId('meatball-menu-button')).toBeInTheDocument();
      expect(screen.getByTestId('window-controls')).toBeInTheDocument();
      expect(screen.queryByTestId('windows-title-bar')).not.toBeInTheDocument();
    });

    it('renders WindowsTitleBar plus the vertical TabBar with its meatball menu (no window-controls slot) when navigationLayout is sidebar', () => {
      restorePlatform = setPlatform('win32');

      renderWithStore(<Shell />, {
        preloadedState: buildState({ navigationLayout: 'sidebar' }),
      });

      expect(screen.getByTestId('windows-title-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('top-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('tab-bar')).toHaveAttribute(
        'data-orientation',
        'vertical'
      );
      expect(screen.getByTestId('meatball-menu-button')).toBeInTheDocument();
      expect(screen.queryByTestId('window-controls')).not.toBeInTheDocument();
    });

    it('does not mount win32 chrome on darwin', () => {
      restorePlatform = setPlatform('darwin');

      renderWithStore(<Shell />, {
        preloadedState: buildState({ navigationLayout: 'tabs' }),
      });

      // win32-only chrome (native window controls + title bar) stays off; the
      // meatball menu is the darwin tabs trailing slot, so it is expected.
      expect(screen.queryByTestId('window-controls')).not.toBeInTheDocument();
      expect(screen.queryByTestId('windows-title-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('meatball-menu-button')).toBeInTheDocument();
    });
  });
});
