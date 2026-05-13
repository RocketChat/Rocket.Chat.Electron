import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../../store/rootReducer';
import { TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET } from '../../../../telephony/actions';
import { TelephonyGlobalShortcut } from './TelephonyGlobalShortcut';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@rocket.chat/fuselage', () => ({
  Box: ({ children, is: component = 'div', ...props }: any) => {
    const Component = component;
    return <Component {...props}>{children}</Component>;
  },
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Field: ({ children }: any) => <div>{children}</div>,
  FieldHint: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FieldLabel: ({ children, ...props }: any) => (
    <label {...props}>{children}</label>
  ),
  FieldRow: ({ children }: any) => <div>{children}</div>,
  TextInput: (props: any) => <input {...props} />,
}));

type PartialState = Pick<
  RootState,
  'telephonyGlobalShortcutConfig' | 'telephonyGlobalShortcutRegistrationStatus'
>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const defaultState: PartialState = {
  telephonyGlobalShortcutConfig: {
    enabled: false,
    accelerator: null,
  },
  telephonyGlobalShortcutRegistrationStatus: {
    registered: false,
    accelerator: null,
    error: null,
  },
};

describe('TelephonyGlobalShortcut', () => {
  it('saves a manually entered accelerator', () => {
    const store = makeStore(defaultState);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    fireEvent.change(screen.getByTestId('telephony-shortcut-input'), {
      target: { value: 'CommandOrControl+Shift+D' },
    });
    fireEvent.click(screen.getByTestId('telephony-shortcut-save'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
      payload: {
        enabled: true,
        accelerator: 'CommandOrControl+Shift+D',
      },
    });
  });

  it('captures a pressed key chord into Electron accelerator syntax', () => {
    const store = makeStore(defaultState);

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    const input = screen.getByTestId('telephony-shortcut-input');
    fireEvent.keyDown(input, {
      key: 'd',
      ctrlKey: true,
      shiftKey: true,
    });

    expect(input).toHaveValue('CommandOrControl+Shift+D');
  });

  it('clears the accelerator and disables registration', () => {
    const store = makeStore({
      ...defaultState,
      telephonyGlobalShortcutConfig: {
        enabled: true,
        accelerator: 'CommandOrControl+Shift+D',
      },
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    fireEvent.click(screen.getByTestId('telephony-shortcut-clear'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
      payload: {
        enabled: false,
        accelerator: null,
      },
    });
  });

  it('shows registration failure feedback from main process status', () => {
    const store = makeStore({
      telephonyGlobalShortcutConfig: {
        enabled: true,
        accelerator: 'CommandOrControl+Shift+D',
      },
      telephonyGlobalShortcutRegistrationStatus: {
        registered: false,
        accelerator: 'CommandOrControl+Shift+D',
        error: 'Shortcut already in use',
      },
    });

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    expect(screen.getByText('Shortcut already in use')).toBeInTheDocument();
  });
});
