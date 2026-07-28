import {
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_SKIP_REQUESTED,
} from '../../../updates/actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';
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
    ...overrides,
  }) as any;

const getLabel = (): HTMLElement =>
  screen.getByRole('button', { name: 'tabBar.update.available' });

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

  it('opens a panel with the version change when clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    expect(
      screen.queryByText('dialog.update.announcement')
    ).not.toBeInTheDocument();

    await user.click(getLabel());

    expect(screen.getByText('dialog.update.announcement')).toBeInTheDocument();
    expect(screen.getByText('4.8.0')).toBeInTheDocument();
    expect(screen.getByText('4.9.0')).toBeInTheDocument();
    // Opening the panel alone must not kick off the download.
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('starts the download from the panel install action', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    await user.click(getLabel());
    await user.click(screen.getByText('dialog.update.install'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_DOWNLOAD_REQUESTED,
    });
  });

  it('skips the version from the panel skip action', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    await user.click(getLabel());
    await user.click(screen.getByText('dialog.update.skip'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATES_SKIP_REQUESTED,
      payload: '4.9.0',
    });
  });

  it('does not offer remind-me-later in the panel', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateLabel />, { preloadedState: buildState() });

    await user.click(getLabel());

    expect(
      screen.queryByText('dialog.update.remindLater')
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
});
