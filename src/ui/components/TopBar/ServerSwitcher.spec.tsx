import {
  SERVER_CONTEXT_MENU_TRIGGERED,
  SERVER_SWITCHER_MENU_TRIGGERED,
} from '../../actions';
import {
  fireEvent,
  renderWithStore,
  screen,
  userEvent,
} from '../../test-utils';
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

const buildState = (overrides: Record<string, unknown> = {}) =>
  ({
    servers: [
      { url: 'https://a.rocket.chat/', title: 'Server A' },
      { url: 'https://b.rocket.chat/', title: 'Server B' },
    ],
    currentView: { url: 'https://a.rocket.chat/' },
    isAddNewServersEnabled: true,
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

  it('flags the trigger when another server has a badge', () => {
    renderWithStore(<ServerSwitcher />, {
      preloadedState: buildState({
        servers: [
          { url: 'https://a.rocket.chat/', title: 'Server A' },
          { url: 'https://b.rocket.chat/', title: 'Server B', badge: '•' },
        ],
      }),
    });

    expect(screen.getByRole('button')).toHaveAttribute(
      'data-has-notification',
      'true'
    );
  });

  it('does not flag the trigger when only the active server has a badge', () => {
    renderWithStore(<ServerSwitcher />, {
      preloadedState: buildState({
        servers: [
          { url: 'https://a.rocket.chat/', title: 'Server A', badge: 3 },
          { url: 'https://b.rocket.chat/', title: 'Server B' },
        ],
      }),
    });

    expect(screen.getByRole('button')).toHaveAttribute(
      'data-has-notification',
      'false'
    );
  });

  it('opens the native switcher menu on click', async () => {
    const user = userEvent.setup();
    renderWithStore(<ServerSwitcher />, { preloadedState: buildState() });

    await user.click(screen.getByRole('button'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: SERVER_SWITCHER_MENU_TRIGGERED })
    );
  });

  it('triggers the native server context menu on right click', () => {
    renderWithStore(<ServerSwitcher />, { preloadedState: buildState() });

    fireEvent.contextMenu(screen.getByRole('button'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SERVER_CONTEXT_MENU_TRIGGERED,
        payload: expect.objectContaining({ url: 'https://a.rocket.chat/' }),
      })
    );
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
});
