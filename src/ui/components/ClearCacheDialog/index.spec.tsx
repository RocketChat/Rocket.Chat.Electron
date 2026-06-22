import { ClearCacheDialog } from '.';
import {
  CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_DIALOG_DISMISSED,
  CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
  CLEAR_CACHE_TRIGGERED,
} from '../../actions';
import { renderWithStore, screen, userEvent, act } from '../../test-utils';

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

// `listen` registers a callback per action type. Capture them so the test can
// drive the dialog's local state (visibility + webContents id) by invoking the
// registered listener, mirroring how the real store dispatches actions.
const listeners = new Map<string, (action: unknown) => void>();

jest.mock('../../../store', () => ({
  listen: (type: string, listener: (action: unknown) => void) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
}));

const triggerOpen = (webContentsId = 7) => {
  act(() => {
    listeners.get(CLEAR_CACHE_TRIGGERED)?.({
      type: CLEAR_CACHE_TRIGGERED,
      payload: webContentsId,
    });
  });
};

describe('ClearCacheDialog', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    listeners.clear();
    // The component's clearingCacheState() schedules a 2s `setTimeout` that
    // updates state after the clear. Under real timers that callback fires
    // after RTL's auto-unmount, updating an unmounted tree and triggering the
    // global `uncaughtException` -> `process.exit(1)` in src/.jest/setup.ts,
    // which kills the whole suite. Fake timers keep the 2s callback from ever
    // firing for real.
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Drop any pending timers BEFORE RTL cleanup unmounts the tree, then
    // restore real timers so nothing leaks into the next test.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders the announcement, title and message', () => {
    renderWithStore(<ClearCacheDialog />);

    expect(
      screen.getByText('dialog.clearCache.announcement')
    ).toBeInTheDocument();
    expect(screen.getByText('dialog.clearCache.title')).toBeInTheDocument();
    expect(screen.getByText('dialog.clearCache.message')).toBeInTheDocument();
  });

  it('renders the keep, delete and cancel buttons', () => {
    renderWithStore(<ClearCacheDialog />);

    expect(
      screen.getByText('dialog.clearCache.keepLoginData')
    ).toBeInTheDocument();
    expect(
      screen.getByText('dialog.clearCache.deleteLoginData')
    ).toBeInTheDocument();
    expect(screen.getByText('dialog.clearCache.cancel')).toBeInTheDocument();
  });

  it('does not dispatch keep/delete before a webContents id is known', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithStore(<ClearCacheDialog />);

    await user.click(screen.getByText('dialog.clearCache.keepLoginData'));

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
      })
    );
  });

  it('dispatches keep-login-data with the triggered webContents id', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithStore(<ClearCacheDialog />);

    triggerOpen(7);
    await user.click(screen.getByText('dialog.clearCache.keepLoginData'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: CLEAR_CACHE_DIALOG_KEEP_LOGIN_DATA_CLICKED,
      payload: 7,
    });
  });

  it('dispatches delete-login-data with the triggered webContents id', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithStore(<ClearCacheDialog />);

    triggerOpen(9);
    await user.click(screen.getByText('dialog.clearCache.deleteLoginData'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: CLEAR_CACHE_DIALOG_DELETE_LOGIN_DATA_CLICKED,
      payload: 9,
    });
  });

  it('dispatches dismissed from the cancel button', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithStore(<ClearCacheDialog />);

    triggerOpen();
    await user.click(screen.getByText('dialog.clearCache.cancel'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: CLEAR_CACHE_DIALOG_DISMISSED,
    });
  });

  it('shows the clearing throbber and hides the buttons after confirming', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithStore(<ClearCacheDialog />);

    triggerOpen();
    await user.click(screen.getByText('dialog.clearCache.keepLoginData'));

    expect(
      screen.getByText('dialog.clearCache.clearingWait')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('dialog.clearCache.keepLoginData')
    ).not.toBeInTheDocument();
  });
});
