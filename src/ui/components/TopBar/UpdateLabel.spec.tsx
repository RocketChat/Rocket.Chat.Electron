import {
  UPDATES_CHECK_FEEDBACK_DISMISSED,
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_OPEN_STORE_PAGE_REQUESTED,
  UPDATES_PANEL_TOGGLED,
  UPDATES_SKIP_REQUESTED,
} from '../../../updates/actions';
import {
  fireEvent,
  renderWithStore,
  screen,
  userEvent,
} from '../../test-utils';
import { UpdateLabel } from './UpdateLabel';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

// Fuselage's <Dropdown> positions itself with usePosition, which under jsdom has
// no real layout and so renders its children as null. Replace only that
// component with an inline passthrough; every other Fuselage component stays
// real.
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
    appVersion: '4.8.0',
    newUpdateVersion: '4.9.0',
    updateDownloadStatus: 'idle',
    updateDownloadProgress: 0,
    isUpdatePanelOpen: false,
    updateCheckStatus: 'idle',
    isUpdatingAllowed: true,
    isUpdatingEnabled: true,
    ...overrides,
  }) as any;

/** State with no update available, as during a manual check. */
const checkState = (
  updateCheckStatus: string,
  overrides: Record<string, unknown> = {}
) => buildState({ newUpdateVersion: null, updateCheckStatus, ...overrides });

/** State with the panel already open, as the store would have it. */
const openState = (overrides: Record<string, unknown> = {}) =>
  buildState({ isUpdatePanelOpen: true, ...overrides });

describe('UpdateLabel', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders nothing when no update is available', () => {
    renderWithStore(<UpdateLabel />, {
      preloadedState: buildState({ newUpdateVersion: null }),
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('announces an available update', () => {
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    const label = screen.getByRole('button');
    expect(label).toHaveTextContent('tabBar.update.available');
    expect(label).toHaveAttribute('data-update-status', 'idle');
  });

  it('requests the panel when clicked while available', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    expect(
      screen.queryByText('dialog.update.announcement')
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_PANEL_TOGGLED,
      payload: true,
    });
  });

  it('shows the version change while the panel is open', () => {
    renderWithStore(<UpdateLabel />, { preloadedState: openState() });

    expect(screen.getByText('dialog.update.announcement')).toBeInTheDocument();
    expect(screen.getByText('4.8.0')).toBeInTheDocument();
    expect(screen.getByText('4.9.0')).toBeInTheDocument();
  });

  it('starts the download from the panel install action', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: openState() });

    await user.click(screen.getByText('dialog.update.install'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_DOWNLOAD_REQUESTED,
    });
  });

  it.each([
    ['mas', 'dialog.update.openStore.mas'],
    ['windows', 'dialog.update.openStore.windows'],
    ['snap', 'dialog.update.openStore.snap'],
    ['flatpak', 'dialog.update.openStore.flatpak'],
  ] as const)(
    'opens the store page instead of downloading on a %s build',
    async (store, labelKey) => {
      const user = userEvent.setup();
      renderWithStore(<UpdateLabel />, {
        preloadedState: openState({ updateStore: store }),
      });

      await user.click(screen.getByText(labelKey));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: UPDATES_OPEN_STORE_PAGE_REQUESTED,
      });
      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: UPDATES_DOWNLOAD_REQUESTED,
      });
    }
  );

  it('skips the version from the panel skip action', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: openState() });

    await user.click(screen.getByText('dialog.update.skip'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_SKIP_REQUESTED,
      payload: '4.9.0',
    });
  });

  it('does not offer remind-me-later in the panel', () => {
    renderWithStore(<UpdateLabel />, { preloadedState: openState() });

    expect(
      screen.queryByText('dialog.update.remindLater')
    ).not.toBeInTheDocument();
  });

  it('closes the panel when clicking outside it', () => {
    renderWithStore(<UpdateLabel />, { preloadedState: openState() });

    // The backdrop covers the whole viewport, including the <webview> whose
    // clicks never reach the host document.
    fireEvent.mouseDown(screen.getByTestId('update-panel-backdrop'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_PANEL_TOGGLED,
      payload: false,
    });
  });

  it('closes the panel on Escape', () => {
    renderWithStore(<UpdateLabel />, { preloadedState: openState() });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_PANEL_TOGGLED,
      payload: false,
    });
  });

  it('has no backdrop while the panel is closed', () => {
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    expect(
      screen.queryByTestId('update-panel-backdrop')
    ).not.toBeInTheDocument();
  });

  it('shows the progress percentage while downloading', () => {
    renderWithStore(<UpdateLabel />, {
      preloadedState: buildState({
        updateDownloadStatus: 'downloading',
        updateDownloadProgress: 45,
      }),
    });

    const label = screen.getByRole('button');
    expect(label).toHaveTextContent('45');
    expect(label).toHaveAttribute('data-update-status', 'downloading');
  });

  it('isolates the percentage in its own element so its width can be reserved', () => {
    const leadingTextAt = (percent: number): string => {
      const { unmount } = renderWithStore(<UpdateLabel />, {
        preloadedState: buildState({
          updateDownloadStatus: 'downloading',
          updateDownloadProgress: percent,
        }),
      });

      // Only the number lives in the percentage element; the static text sits
      // outside it, so reserving a width there cannot shift the rest.
      const percentage = screen.getByTestId('update-progress');
      expect(percentage).toHaveTextContent(String(percent));
      expect(percentage).not.toHaveTextContent('tabBar.update.updating');

      const leading = screen.getByRole('button').firstChild?.textContent ?? '';
      unmount();
      return leading;
    };

    // Identical static text whether the number is one or two digits.
    expect(leadingTextAt(5)).toBe(leadingTextAt(45));
  });

  it('does not dispatch while the download is in flight', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, {
      preloadedState: buildState({
        updateDownloadStatus: 'downloading',
        updateDownloadProgress: 45,
      }),
    });

    await user.click(screen.getByRole('button'));

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('offers the restart once the update finished downloading', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, {
      preloadedState: buildState({
        updateDownloadStatus: 'downloaded',
        updateDownloadProgress: 100,
      }),
    });

    const label = screen.getByRole('button');
    expect(label).toHaveTextContent('tabBar.update.restart');

    await user.click(label);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_INSTALL_REQUESTED,
    });
  });

  describe('manual check feedback', () => {
    it('shows the checking state while a manual check is in flight', () => {
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('checking'),
      });

      const label = screen.getByRole('button');
      expect(label).toHaveTextContent('tabBar.update.checking');
      expect(label).toHaveAttribute('data-update-check-status', 'checking');
    });

    it('disables the pill while checking so it cannot be operated', async () => {
      const user = userEvent.setup();
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('checking'),
      });

      const label = screen.getByRole('button');
      expect(label).toBeDisabled();

      await user.click(label);

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('announces the app is up to date after the check', () => {
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('upToDate'),
      });

      const label = screen.getByRole('button');
      expect(label).toHaveTextContent('tabBar.update.upToDate');
      expect(label).toHaveAttribute('data-update-check-status', 'upToDate');
    });

    it('announces a failed check', () => {
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('failed'),
      });

      const label = screen.getByRole('button');
      expect(label).toHaveTextContent('tabBar.update.checkFailed');
      expect(label).toHaveAttribute('data-update-check-status', 'failed');
    });

    it('dismisses the outcome when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('upToDate'),
      });

      await user.click(screen.getByRole('button'));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: UPDATES_CHECK_FEEDBACK_DISMISSED,
      });
    });

    it('auto-dismisses the outcome after a few seconds', () => {
      jest.useFakeTimers();
      try {
        renderWithStore(<UpdateLabel />, {
          preloadedState: checkState('upToDate'),
        });

        expect(mockDispatch).not.toHaveBeenCalled();

        jest.advanceTimersByTime(6000);

        expect(mockDispatch).toHaveBeenCalledWith({
          type: UPDATES_CHECK_FEEDBACK_DISMISSED,
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not auto-dismiss while still checking', () => {
      jest.useFakeTimers();
      try {
        renderWithStore(<UpdateLabel />, {
          preloadedState: checkState('checking'),
        });

        jest.advanceTimersByTime(60000);

        expect(mockDispatch).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('shows nothing when updates are not allowed in this build', () => {
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('checking', { isUpdatingAllowed: false }),
      });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows nothing when updates are disabled', () => {
      renderWithStore(<UpdateLabel />, {
        preloadedState: checkState('checking', { isUpdatingEnabled: false }),
      });

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it.each(['mas', 'windows', 'snap', 'flatpak'] as const)(
      'still shows checking feedback for a %s build despite isUpdatingAllowed being false',
      (store) => {
        renderWithStore(<UpdateLabel />, {
          preloadedState: checkState('checking', {
            isUpdatingAllowed: false,
            updateStore: store,
          }),
        });

        expect(screen.getByRole('button')).toHaveTextContent(
          'tabBar.update.checking'
        );
      }
    );

    it('prefers the available-update pill over check feedback', () => {
      renderWithStore(<UpdateLabel />, {
        preloadedState: buildState({ updateCheckStatus: 'checking' }),
      });

      const label = screen.getByRole('button');
      expect(label).toHaveTextContent('tabBar.update.available');
    });
  });
});
