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

jest.mock('../SideBar', () => ({
  __esModule: true,
  SideBar: () => <div data-testid='side-bar' />,
}));

jest.mock('../TopBar', () => ({
  __esModule: true,
  TopBar: () => <div data-testid='top-bar' />,
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
    ...overrides,
  }) as any;

describe('Shell', () => {
  it('renders the layout and its primary views without crashing', () => {
    renderWithStore(<Shell />, { preloadedState: buildState() });

    expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    expect(screen.getByTestId('side-bar')).toBeInTheDocument();
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

  it('applies the machine theme when the user preference is auto', () => {
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

  it('applies the explicit user theme preference when it is not auto', () => {
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
});
