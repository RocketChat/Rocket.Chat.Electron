import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../store/rootReducer';
import { TELEPHONY_SERVER_SELECT_CLOSE } from '../../actions';
import { TelephonyServerSelectModal } from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Dialog uses <dialog>.showModal() which is not available in all test environments.
// Mock to a simple conditional wrapper so tests stay focused on modal content/dispatch logic.
jest.mock('../Dialog', () => ({
  Dialog: ({
    children,
    isVisible,
    onClose,
  }: {
    children?: ReactNode;
    isVisible?: boolean;
    onClose?: () => void;
  }) =>
    isVisible ? (
      <div data-testid='dialog' role='dialog'>
        <button data-testid='dialog-close' onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ) : null,
}));

type PartialState = Pick<RootState, 'servers' | 'dialogs'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const twoServers = [
  { url: 'https://chat.alpha.com', title: 'Alpha Chat' },
  { url: 'https://chat.beta.com', title: 'Beta Chat' },
];

const openDialogState = (
  servers: PartialState['servers'] = twoServers
): PartialState => ({
  servers,
  dialogs: {
    telephonyServerSelect: {
      isOpen: true,
      phoneNumber: '123',
      rawUri: 'tel:123',
    },
    serverInfoModal: { isOpen: false, serverData: null },
  } as unknown as RootState['dialogs'],
});

const closedDialogState = (
  servers: PartialState['servers'] = twoServers
): PartialState => ({
  servers,
  dialogs: {
    telephonyServerSelect: {
      isOpen: false,
      phoneNumber: '',
      rawUri: '',
    },
    serverInfoModal: { isOpen: false, serverData: null },
  } as unknown as RootState['dialogs'],
});

describe('TelephonyServerSelectModal', () => {
  it('renders nothing when dialog is closed', () => {
    const store = makeStore(closedDialogState());
    const { container } = render(
      <Provider store={store}>
        <TelephonyServerSelectModal />
      </Provider>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders server items when dialog is open with 2 servers', () => {
    const store = makeStore(openDialogState());
    render(
      <Provider store={store}>
        <TelephonyServerSelectModal />
      </Provider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Alpha Chat')).toBeInTheDocument();
    expect(screen.getByText('Beta Chat')).toBeInTheDocument();
  });

  it('clicking a server dispatches TELEPHONY_SERVER_SELECT_CLOSE with serverUrl and rememberChoice false', () => {
    const store = makeStore(openDialogState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyServerSelectModal />
      </Provider>
    );

    fireEvent.click(screen.getByText('Alpha Chat'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_SERVER_SELECT_CLOSE,
      payload: {
        serverUrl: 'https://chat.alpha.com',
        rememberChoice: false,
      },
    });
  });

  it('clicking a server with rememberChoice checked dispatches rememberChoice true', () => {
    const store = makeStore(openDialogState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyServerSelectModal />
      </Provider>
    );

    // Toggle the checkbox via the label (label uses onClick to toggle state)
    const label = screen.getByText(
      'dialog.telephonySelectServer.rememberChoice'
    );
    fireEvent.click(label);

    fireEvent.click(screen.getByText('Alpha Chat'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_SERVER_SELECT_CLOSE,
      payload: {
        serverUrl: 'https://chat.alpha.com',
        rememberChoice: true,
      },
    });
  });

  it('dialog onClose dispatches TELEPHONY_SERVER_SELECT_CLOSE with null payload', () => {
    const store = makeStore(openDialogState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyServerSelectModal />
      </Provider>
    );

    fireEvent.click(screen.getByTestId('dialog-close'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_SERVER_SELECT_CLOSE,
      payload: null,
    });
  });

  it('rememberChoice resets to false after close', () => {
    const store = makeStore(openDialogState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    const { rerender } = render(
      <Provider store={store}>
        <TelephonyServerSelectModal />
      </Provider>
    );

    // Toggle rememberChoice on
    const label = screen.getByText(
      'dialog.telephonySelectServer.rememberChoice'
    );
    fireEvent.click(label);

    // Close the dialog
    fireEvent.click(screen.getByTestId('dialog-close'));

    // Reopen: rebuild store with open state (simulates a new open event)
    const store2 = makeStore(openDialogState());
    const dispatchSpy2 = jest.spyOn(store2, 'dispatch');

    rerender(
      <Provider store={store2}>
        <TelephonyServerSelectModal />
      </Provider>
    );

    // After reopening, click a server — rememberChoice should be false (was reset by close)
    fireEvent.click(screen.getByText('Alpha Chat'));

    expect(dispatchSpy2).toHaveBeenCalledWith({
      type: TELEPHONY_SERVER_SELECT_CLOSE,
      payload: {
        serverUrl: 'https://chat.alpha.com',
        rememberChoice: false,
      },
    });

    // Suppress unused var warning — dispatchSpy was used to trigger close above
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
