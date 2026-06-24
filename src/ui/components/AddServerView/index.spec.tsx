import { AddServerView } from '.';
import { ServerUrlResolutionStatus } from '../../../servers/common';
import { ADD_SERVER_VIEW_SERVER_ADDED } from '../../actions';
import {
  renderWithStore,
  screen,
  userEvent,
  fireEvent,
  waitFor,
} from '../../test-utils';

// Under the jest-electron renderer, `userEvent.type` mutates the DOM input but
// React's controlled-input value tracker does not pick the change up, so the
// component's `useState` value (and therefore the submit handler) never sees the
// typed text. `fireEvent.change` dispatches a native change event that React's
// value tracker does recognise, faithfully driving `onChange` -> `setInput`.
const typeUrl = (value: string): void => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } });
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
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

const mockRequest = jest.fn();

jest.mock('../../../store', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

const defaultServerHref = 'https://open.rocket.chat/';

const visibleState = { currentView: 'add-new-server' } as any;

beforeEach(() => {
  mockDispatch.mockClear();
  mockRequest.mockReset();
  // jsdom defaults navigator.onLine to true; assert it explicitly.
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});

describe('AddServerView', () => {
  it('renders nothing when the current view is not add-new-server', () => {
    const { container } = renderWithStore(<AddServerView />, {
      preloadedState: { currentView: 'add-new-server-disabled' } as any,
    });

    expect(container).toBeEmptyDOMElement();
  });

  describe('online', () => {
    it('renders the url input and connect button', () => {
      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      expect(screen.getByText('landing.inputUrl')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'landing.connect' })
      ).toBeInTheDocument();
    });

    it('adds the default server when submitting an empty input', async () => {
      const user = userEvent.setup();
      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      await user.click(screen.getByRole('button', { name: 'landing.connect' }));

      expect(mockRequest).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: ADD_SERVER_VIEW_SERVER_ADDED,
        payload: defaultServerHref,
      });
    });

    it('resolves a typed url and dispatches the resolved server on success', async () => {
      const user = userEvent.setup();
      mockRequest.mockResolvedValue([
        'https://chat.example.com/',
        ServerUrlResolutionStatus.OK,
      ]);

      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      typeUrl('chat.example.com');
      await user.click(screen.getByRole('button', { name: 'landing.connect' }));

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: ADD_SERVER_VIEW_SERVER_ADDED,
          payload: 'https://chat.example.com/',
        })
      );

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('shows an invalid-url error when resolution fails', async () => {
      const user = userEvent.setup();
      mockRequest.mockResolvedValue([
        'bad-url',
        ServerUrlResolutionStatus.INVALID_URL,
      ]);

      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      typeUrl('bad-url');
      await user.click(screen.getByRole('button', { name: 'landing.connect' }));

      expect(
        await screen.findByText('error.noValidServerFound')
      ).toBeInTheDocument();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows a timeout error when resolution times out', async () => {
      const user = userEvent.setup();
      mockRequest.mockResolvedValue([
        'https://slow.example.com/',
        ServerUrlResolutionStatus.TIMEOUT,
      ]);

      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      typeUrl('slow.example.com');
      await user.click(screen.getByRole('button', { name: 'landing.connect' }));

      expect(
        await screen.findByText('error.connectTimeout')
      ).toBeInTheDocument();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('clears the validation error when the input is edited again', async () => {
      const user = userEvent.setup();
      mockRequest.mockResolvedValue([
        'bad-url',
        ServerUrlResolutionStatus.INVALID,
      ]);

      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      typeUrl('bad-url');
      await user.click(screen.getByRole('button', { name: 'landing.connect' }));

      expect(
        await screen.findByText('error.noValidServerFound')
      ).toBeInTheDocument();

      // Editing the input again resets the validation state and clears the error.
      typeUrl('bad-urlx');

      await waitFor(() =>
        expect(
          screen.queryByText('error.noValidServerFound')
        ).not.toBeInTheDocument()
      );
    });
  });

  describe('offline', () => {
    it('shows the offline callout instead of the form', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });

      renderWithStore(<AddServerView />, { preloadedState: visibleState });

      expect(screen.getByText('error.offline')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });
});
