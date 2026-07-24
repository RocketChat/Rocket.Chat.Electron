import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
} from '../../actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';
import { ServerSwitcher } from './ServerSwitcher';

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

// Fuselage's <Dropdown> renders into an unreachable portal/tile under jsdom;
// replace it with an inline passthrough so the options render in the tree.
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

const buildState = (overrides: Record<string, unknown> = {}) =>
  ({
    servers: [
      { url: 'https://a.rocket.chat/', title: 'Server A' },
      { url: 'https://b.rocket.chat/', title: 'Server B' },
    ],
    currentView: { url: 'https://a.rocket.chat/' },
    ...overrides,
  }) as any;

describe('ServerSwitcher', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('shows the active server name in the trigger', () => {
    renderWithStore(<ServerSwitcher />, { preloadedState: buildState() });

    expect(screen.getByRole('button')).toHaveTextContent('Server A');
  });

  it('shows a notification indicator when another server has a badge', () => {
    renderWithStore(<ServerSwitcher />, {
      preloadedState: buildState({
        servers: [
          { url: 'https://a.rocket.chat/', title: 'Server A' },
          { url: 'https://b.rocket.chat/', title: 'Server B', badge: '•' },
        ],
      }),
    });

    expect(
      screen.getByTestId('server-switcher-notification')
    ).toBeInTheDocument();
  });

  it('does not show a notification indicator when only the active server has a badge', () => {
    renderWithStore(<ServerSwitcher />, {
      preloadedState: buildState({
        servers: [
          { url: 'https://a.rocket.chat/', title: 'Server A', badge: 3 },
          { url: 'https://b.rocket.chat/', title: 'Server B' },
        ],
      }),
    });

    expect(
      screen.queryByTestId('server-switcher-notification')
    ).not.toBeInTheDocument();
  });

  it('lists servers and dispatches selection when one is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<ServerSwitcher />, { preloadedState: buildState() });

    await user.click(screen.getByRole('button'));

    const optionB = screen.getByText('Server B');
    await user.click(optionB);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_SELECTED,
      payload: 'https://b.rocket.chat/',
    });
  });

  it('strips the protocol and trailing slash from address-like names', () => {
    renderWithStore(<ServerSwitcher />, {
      preloadedState: buildState({
        servers: [
          {
            url: 'https://a.rocket.chat/',
            title: 'https://a.rocket.chat/',
          },
        ],
        currentView: { url: 'https://a.rocket.chat/' },
      }),
    });

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('a.rocket.chat');
    expect(trigger).not.toHaveTextContent('https://');
  });

  it('shows the view title when a utility page is open', () => {
    renderWithStore(<ServerSwitcher />, {
      preloadedState: buildState({ currentView: 'settings' }),
    });

    expect(screen.getByRole('button')).toHaveTextContent('sidebar.settings');
  });

  it('offers settings, downloads and add-server options that dispatch', async () => {
    const user = userEvent.setup();
    renderWithStore(<ServerSwitcher />, { preloadedState: buildState() });

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('sidebar.settings'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SETTINGS_BUTTON_CLICKED,
    });

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('sidebar.downloads'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
    });

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('sidebar.addNewServer'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_ADD_NEW_SERVER_CLICKED,
    });
  });
});
