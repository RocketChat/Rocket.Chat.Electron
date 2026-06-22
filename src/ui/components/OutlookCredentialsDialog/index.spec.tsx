import { OutlookCredentialsDialog } from '.';
import {
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_DIALOG_DISMISSED,
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
} from '../../../outlookCalendar/actions';
import {
  renderWithStore,
  screen,
  userEvent,
  act,
  waitFor,
  fireEvent,
} from '../../test-utils';

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

// `listen` registers a callback per action type. Capture it so the test can
// drive the dialog's local state (server, userId, encryption availability) the
// way OUTLOOK_CALENDAR_ASK_CREDENTIALS would in the real store.
const listeners = new Map<string, (action: unknown) => void>();

jest.mock('../../../store', () => ({
  listen: (type: string, listener: (action: unknown) => void) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
}));

const SERVER_URL = 'https://chat.example.com/';
const REQUEST_ID = 'req-1';

const askCredentials = ({
  isEncryptionAvailable = true,
}: { isEncryptionAvailable?: boolean } = {}) => {
  act(() => {
    listeners.get(OUTLOOK_CALENDAR_ASK_CREDENTIALS)?.({
      type: OUTLOOK_CALENDAR_ASK_CREDENTIALS,
      payload: {
        server: {
          url: SERVER_URL,
          outlookCredentials: { serverUrl: 'https://exchange.example.com' },
        },
        userId: 'user-42',
        isEncryptionAvailable,
      },
      meta: { request: true, id: REQUEST_ID },
    });
  });
};

const preloadedState = { openDialog: 'outlook-credentials' } as any;

describe('OutlookCredentialsDialog', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    listeners.clear();
  });

  it('renders the title, both inputs and the remember-credentials checkbox', () => {
    renderWithStore(<OutlookCredentialsDialog />, { preloadedState });

    expect(
      screen.getByText('dialog.outlookCalendar.title')
    ).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(
      screen.getByText('dialog.outlookCalendar.remember_credentials')
    ).toBeInTheDocument();
  });

  it('shows required-field errors for empty inputs', async () => {
    renderWithStore(<OutlookCredentialsDialog />, { preloadedState });
    askCredentials();

    // The form validates with react-hook-form in `onChange` mode. Touching then
    // clearing each required field deterministically drives validation and
    // surfaces the required-field errors. Submitting untouched-empty fields and
    // relying on the submit-time validation pass is racy under the jest-electron
    // renderer (the async validation result intermittently fails to flush), so
    // the per-field onChange path is used instead. `userEvent.type` is avoided
    // because its synthetic keystrokes do not reach react-hook-form's value
    // tracker in this environment — `fireEvent.change` dispatches the native
    // change event the tracker recognises.
    const [login] = screen.getAllByRole('textbox');
    const password = document.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement;
    fireEvent.change(login, { target: { value: 'a' } });
    fireEvent.change(login, { target: { value: '' } });
    fireEvent.change(password, { target: { value: 'a' } });
    fireEvent.change(password, { target: { value: '' } });

    await waitFor(() =>
      expect(
        screen.queryAllByText('dialog.outlookCalendar.field_required')
      ).toHaveLength(2)
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: OUTLOOK_CALENDAR_SET_CREDENTIALS })
    );
  });

  it('dispatches the credentials with the captured server, userId and request id', async () => {
    const user = userEvent.setup();
    renderWithStore(<OutlookCredentialsDialog />, { preloadedState });
    askCredentials();

    // Login renders as a textbox; PasswordInput renders type=password, which is
    // not exposed with the textbox role, so it is queried by its input type.
    // `fireEvent.change` is used over `userEvent.type` because the latter's
    // keystrokes do not propagate to react-hook-form's value tracker under the
    // jest-electron renderer.
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'jane' },
    });
    const password = document.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement;
    fireEvent.change(password, { target: { value: 's3cret' } });

    await user.click(screen.getByText('dialog.outlookCalendar.submit'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
        payload: expect.objectContaining({
          url: SERVER_URL,
          saveCredentials: true,
          outlookCredentials: expect.objectContaining({
            login: 'jane',
            password: 's3cret',
            userId: 'user-42',
            serverUrl: 'https://exchange.example.com',
          }),
        }),
        meta: { response: true, id: REQUEST_ID },
      })
    );
  });

  it('dispatches the dismissed action with the request id on cancel', async () => {
    const user = userEvent.setup();
    renderWithStore(<OutlookCredentialsDialog />, { preloadedState });
    askCredentials();

    await user.click(screen.getByText('dialog.outlookCalendar.cancel'));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OUTLOOK_CALENDAR_DIALOG_DISMISSED,
        payload: { dismissDialog: true },
        meta: { response: true, id: REQUEST_ID },
      })
    );
  });

  it('warns when encryption is unavailable and remember-credentials is on', async () => {
    renderWithStore(<OutlookCredentialsDialog />, { preloadedState });
    askCredentials({ isEncryptionAvailable: false });

    expect(
      await screen.findByText('dialog.outlookCalendar.encryptionUnavailable')
    ).toBeInTheDocument();
  });

  it('hides the encryption warning while encryption is available', () => {
    renderWithStore(<OutlookCredentialsDialog />, { preloadedState });
    askCredentials({ isEncryptionAvailable: true });

    expect(
      screen.queryByText('dialog.outlookCalendar.encryptionUnavailable')
    ).not.toBeInTheDocument();
  });
});
