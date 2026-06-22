import { ipcRenderer } from 'electron';

import { SupportedVersionDialog } from '.';
import * as urls from '../../../urls';
import { SUPPORTED_VERSION_DIALOG_DISMISS } from '../../actions';
import { renderWithStore, screen, userEvent, waitFor } from '../../test-utils';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    __esModule: true,
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

// The dialog only becomes visible once `isServerVersionSupported` resolves an
// expiration message; mock both the support check and the translation helper so
// the visible branch renders deterministically.
const isServerVersionSupported = jest.fn();
const getExpirationMessageTranslated = jest.fn();

jest.mock('../../../servers/supportedVersions/main', () => ({
  isServerVersionSupported: (...args: unknown[]) =>
    isServerVersionSupported(...args),
  getExpirationMessageTranslated: (...args: unknown[]) =>
    getExpirationMessageTranslated(...args),
}));

const invokeMock = ipcRenderer.invoke as jest.MockedFunction<
  typeof ipcRenderer.invoke
>;

const SERVER_URL = 'https://chat.example.com/';

const translatedMessage = {
  title: 'Workspace expiring',
  subtitle: 'Action required',
  description: 'Your workspace will lose support soon.',
  link: 'https://chat.example.com/learn-more',
};

const preloadedState = {
  currentView: { url: SERVER_URL },
  servers: [
    {
      url: SERVER_URL,
      title: 'Example',
      version: '6.0.0',
      supportedVersions: { versions: [], messages: [] },
    },
  ],
} as any;

describe('SupportedVersionDialog', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    invokeMock.mockClear();
    isServerVersionSupported.mockReset();
    getExpirationMessageTranslated.mockReset();

    isServerVersionSupported.mockResolvedValue({
      supported: true,
      message: { title: 'x' },
      expiration: new Date('2099-01-01'),
      i18n: {},
    });
    getExpirationMessageTranslated.mockReturnValue(translatedMessage);
  });

  it('renders the translated expiration message once the check resolves', async () => {
    renderWithStore(<SupportedVersionDialog />, { preloadedState });

    expect(await screen.findByText('Workspace expiring')).toBeInTheDocument();
    expect(screen.getByText('Action required')).toBeInTheDocument();
    expect(
      screen.getByText('Your workspace will lose support soon.')
    ).toBeInTheDocument();
  });

  it('renders the more-information button', async () => {
    renderWithStore(<SupportedVersionDialog />, { preloadedState });

    await screen.findByText('Workspace expiring');
    expect(
      screen.getByText('unsupportedServer.moreInformation')
    ).toBeInTheDocument();
  });

  it('opens both the message link and the docs url on more-information', async () => {
    const user = userEvent.setup();
    renderWithStore(<SupportedVersionDialog />, { preloadedState });

    await screen.findByText('Workspace expiring');
    await user.click(screen.getByText('unsupportedServer.moreInformation'));

    expect(invokeMock).toHaveBeenCalledWith(
      'server-view/open-url-on-browser',
      translatedMessage.link
    );
    expect(invokeMock).toHaveBeenCalledWith(
      'server-view/open-url-on-browser',
      urls.docs.supportedVersions
    );
  });

  it('only opens the docs url when the message has no link', async () => {
    getExpirationMessageTranslated.mockReturnValue({
      ...translatedMessage,
      link: '',
    });
    const user = userEvent.setup();
    renderWithStore(<SupportedVersionDialog />, { preloadedState });

    await screen.findByText('Workspace expiring');
    await user.click(screen.getByText('unsupportedServer.moreInformation'));

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      'server-view/open-url-on-browser',
      urls.docs.supportedVersions
    );
  });

  it('dispatches the dismiss action with the server url on close', async () => {
    const user = userEvent.setup();
    renderWithStore(<SupportedVersionDialog />, { preloadedState });

    await screen.findByText('Workspace expiring');
    // ModalClose renders an IconButton with aria-label="Close".
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SUPPORTED_VERSION_DIALOG_DISMISS,
      payload: { url: SERVER_URL },
    });
  });

  it('does not become visible when no server version check resolves a message', async () => {
    isServerVersionSupported.mockResolvedValue({
      supported: true,
      message: undefined,
      expiration: undefined,
    });
    renderWithStore(<SupportedVersionDialog />, { preloadedState });

    await waitFor(() => expect(isServerVersionSupported).toHaveBeenCalled());
    expect(screen.queryByText('Workspace expiring')).not.toBeInTheDocument();
  });
});
