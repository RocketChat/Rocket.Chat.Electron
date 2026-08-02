import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { AboutDialog } from '.';
import { ABOUT_DIALOG_DISMISSED } from '../../actions';

// Stable `t` reference — AboutDialog's effect depends on `t` and will infinite-
// loop if useTranslation returns a new function every render.
const tStable = (key: string) => key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tStable,
    i18n: { language: 'en' },
  }),
  Trans: ({ i18nKey }: { i18nKey?: string }) => (
    <span data-testid='about-version'>{i18nKey ?? 'trans'}</span>
  ),
}));

jest.mock('../../../app/main/app', () => ({
  packageJsonInformation: {
    productName: 'Rocket.Chat',
  },
}));

jest.mock('../RocketChatLogo', () => ({
  RocketChatLogo: () => <div data-testid='logo' />,
}));

jest.mock('../Dialog', () => ({
  Dialog: ({
    children,
    isVisible,
    onClose,
  }: {
    children: React.ReactNode;
    isVisible?: boolean;
    onClose?: () => void;
  }) =>
    isVisible ? (
      <div role='dialog'>
        <button type='button' onClick={onClose}>
          close-dialog
        </button>
        {children}
      </div>
    ) : null,
}));

const makeStore = (partial: Record<string, unknown>) => {
  const reducer = (state = partial) => state;
  return createStore(reducer as any);
};

// Keep update-related flags off so the useEffect timer path is not entered
// (isCheckingForUpdates/newUpdateVersion/updateError all falsy → still sets a
// 5s timer in production). We unmount immediately after assertions.
const baseState = {
  appVersion: '4.0.0',
  doCheckForUpdatesOnStartup: false,
  isCheckingForUpdates: true, // short-circuits effect before setTimeout
  isEachUpdatesSettingConfigurable: false,
  isUpdatingAllowed: false,
  isUpdatingEnabled: false,
  newUpdateVersion: null,
  openDialog: 'about',
  updateError: null,
  updateChannel: 'latest',
  isDeveloperModeEnabled: false,
};

describe('AboutDialog', () => {
  it('renders when visible and dispatches dismiss on close', () => {
    const store = makeStore(baseState);
    const spy = jest.spyOn(store, 'dispatch');
    const { unmount } = render(
      <Provider store={store}>
        <AboutDialog />
      </Provider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByTestId('about-version')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close-dialog'));
    expect(spy).toHaveBeenCalledWith({ type: ABOUT_DIALOG_DISMISSED });
    unmount();
  });

  it('renders nothing interactive when dialog is closed', () => {
    const store = makeStore({ ...baseState, openDialog: null });
    const { container, unmount } = render(
      <Provider store={store}>
        <AboutDialog />
      </Provider>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    unmount();
  });
});
