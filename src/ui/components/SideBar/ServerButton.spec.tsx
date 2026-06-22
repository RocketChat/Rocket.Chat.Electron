import {
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_SERVER_RELOAD,
  SIDE_BAR_SERVER_COPY_URL,
  SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
  SIDE_BAR_SERVER_FORCE_RELOAD,
  SIDE_BAR_SERVER_REMOVE,
  OPEN_SERVER_INFO_MODAL,
} from '../../actions';
import { render, screen, userEvent } from '../../test-utils';
import ServerButton from './ServerButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

jest.mock('./ServerInfoDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid='server-info-dropdown' />,
}));

// Fuselage's <Dropdown> resolves to its mobile variant under jsdom (matchMedia
// has no real layout) and renders its children into an unreachable portal/tile.
// Replace only that component with an inline passthrough so the menu Options
// render in the tree; every other Fuselage component stays real.
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage');
  return {
    __esModule: true,
    ...actual,
    Dropdown: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='dropdown'>{children}</div>
    ),
  };
});

const dragNoop = {
  onDragStart: jest.fn(),
  onDragEnd: jest.fn(),
  onDragEnter: jest.fn(),
  onDrop: jest.fn(),
};

const renderButton = (
  overrides: Partial<React.ComponentProps<typeof ServerButton>> = {}
) =>
  render(
    <ServerButton
      url='https://open.rocket.chat'
      title='Open Rocket.Chat'
      shortcutNumber='1'
      isSelected={false}
      favicon={null}
      isShortcutVisible={false}
      hasUnreadMessages={false}
      isDragged={false}
      userLoggedIn
      {...dragNoop}
      {...overrides}
    />
  );

describe('ServerButton', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders computed initials from the title when no favicon is set', () => {
    renderButton({ title: 'Open Rocket', favicon: null });

    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders an avatar image when a favicon is provided', () => {
    renderButton({ favicon: 'https://open.rocket.chat/favicon.png' });

    const avatar = document.querySelector('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute(
      'src',
      'https://open.rocket.chat/favicon.png'
    );
  });

  it('shows a mention badge when there are mentions', () => {
    renderButton({ mentionCount: 3, hasUnreadMessages: true });

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows a warning badge when the user is not logged in', () => {
    renderButton({ userLoggedIn: false });

    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('dispatches a server-selected action on click', async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_SELECTED,
      payload: 'https://open.rocket.chat',
    });
  });

  it('does not render the action dropdown until the context menu opens', () => {
    renderButton();

    expect(screen.queryByText('sidebar.item.reload')).not.toBeInTheDocument();
  });

  it('opens the action dropdown on context menu and dispatches reload', async () => {
    const user = userEvent.setup();
    const { container } = renderButton();

    const wrapper = container.querySelector(
      '[draggable="true"]'
    ) as HTMLElement;
    await user.pointer({ keys: '[MouseRight]', target: wrapper });

    expect(screen.getByText('sidebar.item.reload')).toBeInTheDocument();

    await user.click(screen.getByText('sidebar.item.reload'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_RELOAD,
      payload: 'https://open.rocket.chat',
    });
  });

  it('dispatches copy-url, dev-tools, force-reload and remove actions from the dropdown', async () => {
    const user = userEvent.setup();
    const { container } = renderButton();

    const wrapper = container.querySelector(
      '[draggable="true"]'
    ) as HTMLElement;

    await user.pointer({ keys: '[MouseRight]', target: wrapper });
    await user.click(screen.getByText('sidebar.item.copyCurrentUrl'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_COPY_URL,
      payload: 'https://open.rocket.chat',
    });

    await user.pointer({ keys: '[MouseRight]', target: wrapper });
    await user.click(screen.getByText('sidebar.item.openDevTools'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
      payload: 'https://open.rocket.chat',
    });

    await user.pointer({ keys: '[MouseRight]', target: wrapper });
    await user.click(screen.getByText('sidebar.item.reloadClearingCache'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_FORCE_RELOAD,
      payload: 'https://open.rocket.chat',
    });

    await user.pointer({ keys: '[MouseRight]', target: wrapper });
    await user.click(screen.getByText('sidebar.item.remove'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_REMOVE,
      payload: 'https://open.rocket.chat',
    });
  });

  it('dispatches the open-server-info-modal action with the server details', async () => {
    const user = userEvent.setup();
    const { container } = renderButton({
      version: '6.5.0',
      exchangeUrl: 'https://exchange.example.com',
      isSupportedVersion: true,
      supportedVersionsSource: 'cloud',
      supportedVersionsFetchState: 'success',
    });

    const wrapper = container.querySelector(
      '[draggable="true"]'
    ) as HTMLElement;
    await user.pointer({ keys: '[MouseRight]', target: wrapper });

    await user.click(screen.getByText('sidebar.item.serverInfo'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: OPEN_SERVER_INFO_MODAL,
      payload: {
        url: 'https://open.rocket.chat',
        version: '6.5.0',
        exchangeUrl: 'https://exchange.example.com',
        isSupportedVersion: true,
        supportedVersionsSource: 'cloud',
        supportedVersionsFetchState: 'success',
        supportedVersions: undefined,
      },
    });
  });
});
