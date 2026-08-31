import { act } from '@testing-library/react';
import { ipcRenderer } from 'electron';

import {
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_CHECKING_FOR_UPDATE,
  UPDATES_NEW_VERSION_AVAILABLE,
  UPDATES_NEW_VERSION_NOT_AVAILABLE,
} from '../../../../updates/actions';
import { renderWithStore, screen, userEvent } from '../../../test-utils';
import { CheckForUpdates } from './CheckForUpdates';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
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

const invokeMock = ipcRenderer.invoke as jest.MockedFunction<
  typeof ipcRenderer.invoke
>;

const preloadedState = {
  isUpdatingAllowed: true,
  isUpdatingEnabled: true,
  isEachUpdatesSettingConfigurable: true,
  doCheckForUpdatesOnStartup: true,
  isCheckingForUpdates: false,
  newUpdateVersion: null,
  updateError: null,
} as any;

describe('CheckForUpdates', () => {
  beforeEach(() => {
    invokeMock.mockClear();
    invokeMock.mockResolvedValue(undefined);
  });

  it('does not show a result or open the panel from stale state before the check actually starts', () => {
    const { store } = renderWithStore(<CheckForUpdates />, {
      preloadedState: { ...preloadedState, newUpdateVersion: '9.9.9' },
    });

    act(() => {
      store.dispatch({ type: UPDATES_CHECK_FOR_UPDATES_REQUESTED } as any);
    });

    // The reducer flips `updateCheckStatus` but `isCheckingForUpdates` stays
    // false until the async `checking-for-update` event arrives; the click
    // handler must not treat that gap as a settled check.
    expect(
      screen.queryByText('dialog.about.noUpdatesAvailable')
    ).not.toBeInTheDocument();
    expect(store.getState().isUpdatePanelOpen).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('shows "no updates available" only after the check has actually started and settled', async () => {
    const { store } = renderWithStore(<CheckForUpdates />, {
      preloadedState,
    });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('button', { name: 'dialog.about.checkUpdates' })
    );

    act(() => {
      store.dispatch({ type: UPDATES_CHECKING_FOR_UPDATE } as any);
    });
    act(() => {
      store.dispatch({ type: UPDATES_NEW_VERSION_NOT_AVAILABLE } as any);
    });

    expect(
      await screen.findByText('dialog.about.noUpdatesAvailable')
    ).toBeInTheDocument();
    expect(store.getState().isUpdatePanelOpen).toBe(false);
  });

  it('opens the update panel and hands over to the root window once a check finds a version', async () => {
    const { store } = renderWithStore(<CheckForUpdates />, {
      preloadedState,
    });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('button', { name: 'dialog.about.checkUpdates' })
    );

    act(() => {
      store.dispatch({ type: UPDATES_CHECKING_FOR_UPDATE } as any);
    });
    act(() => {
      store.dispatch({
        type: UPDATES_NEW_VERSION_AVAILABLE,
        payload: '10.0.0',
      } as any);
    });

    expect(store.getState().isUpdatePanelOpen).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('settings-window/close-requested');
  });

  it('ignores a stale newUpdateVersion left over from a previous check when no check was requested', () => {
    renderWithStore(<CheckForUpdates />, {
      preloadedState: { ...preloadedState, newUpdateVersion: '9.9.9' },
    });

    expect(
      screen.queryByText('dialog.about.noUpdatesAvailable')
    ).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('renders nothing when updates are not allowed in this build', () => {
    renderWithStore(<CheckForUpdates />, {
      preloadedState: { ...preloadedState, isUpdatingAllowed: false },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing when updates are disabled', () => {
    renderWithStore(<CheckForUpdates />, {
      preloadedState: { ...preloadedState, isUpdatingEnabled: false },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each(['mas', 'windows', 'snap', 'flatpak'] as const)(
    'still renders the check button for a %s build despite isUpdatingAllowed being false',
    (store) => {
      renderWithStore(<CheckForUpdates />, {
        preloadedState: {
          ...preloadedState,
          isUpdatingAllowed: false,
          updateStore: store,
        },
      });

      expect(
        screen.getByRole('button', { name: 'dialog.about.checkUpdates' })
      ).toBeInTheDocument();
    }
  );
});
