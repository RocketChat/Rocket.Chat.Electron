import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../../store/rootReducer';
import { TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET } from '../../../../telephony/actions';
import { TelephonyGlobalShortcut } from './TelephonyGlobalShortcut';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { defaultValue?: string } & Record<string, unknown>
    ) => {
      if (!options) return key;
      const { defaultValue, ...rest } = options;
      if (defaultValue !== undefined && Object.keys(rest).length === 0) {
        return defaultValue;
      }
      const interpolated = Object.entries(rest)
        .map(([name, value]) => `${name}=${String(value)}`)
        .join(' ');
      return interpolated ? `${key} ${interpolated}` : key;
    },
  }),
}));

jest.mock('@rocket.chat/fuselage', () => ({
  Box: ({
    children,
    is: component = 'div',
    display: _display,
    alignItems: _alignItems,
    flexGrow: _flexGrow,
    ...props
  }: any) => {
    const Component = component;
    return <Component {...props}>{children}</Component>;
  },
  Button: ({ children, mis: _mis, ...props }: any) => (
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
  | 'telephonyGlobalShortcutConfig'
  | 'telephonyGlobalShortcutRegistrationStatus'
  | 'isTelephonyEnabled'
>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const defaultState: PartialState = {
  isTelephonyEnabled: true,
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

const originalPlatform = process.platform;

describe('TelephonyGlobalShortcut', () => {
  beforeAll(() => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('saves an accelerator captured from a key chord', () => {
    const store = makeStore(defaultState);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

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
    fireEvent.click(screen.getByTestId('telephony-shortcut-save'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
      payload: {
        enabled: true,
        accelerator: 'CommandOrControl+Shift+D',
      },
    });
  });

  it('captures a pressed key chord and renders it in the input', () => {
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

    expect(input).toHaveValue('Ctrl+Shift+D');
  });

  it('shows capture placeholder while the shortcut input is focused', () => {
    const store = makeStore(defaultState);

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    const input = screen.getByTestId('telephony-shortcut-input');
    expect(input).toHaveAttribute(
      'placeholder',
      'settings.options.telephonyShortcut.placeholder'
    );

    fireEvent.focus(input);
    expect(input).toHaveAttribute(
      'placeholder',
      'settings.options.telephonyShortcut.capturePlaceholder'
    );

    fireEvent.blur(input);
    expect(input).toHaveAttribute(
      'placeholder',
      'settings.options.telephonyShortcut.placeholder'
    );
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

  it('does not save reserved copy/paste accelerators', () => {
    const store = makeStore(defaultState);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    const input = screen.getByTestId('telephony-shortcut-input');
    fireEvent.keyDown(input, {
      key: 'c',
      ctrlKey: true,
    });
    fireEvent.click(screen.getByTestId('telephony-shortcut-save'));

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Ctrl\+C/)).toBeInTheDocument();
  });

  it('does not save accelerators used by the app menu', () => {
    const store = makeStore(defaultState);
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    const input = screen.getByTestId('telephony-shortcut-input');
    fireEvent.keyDown(input, {
      key: 'n',
      ctrlKey: true,
    });
    fireEvent.click(screen.getByTestId('telephony-shortcut-save'));

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('restores the saved accelerator when capture is cancelled with Escape', () => {
    const store = makeStore({
      ...defaultState,
      telephonyGlobalShortcutConfig: {
        enabled: true,
        accelerator: 'CommandOrControl+Shift+D',
      },
    });

    render(
      <Provider store={store}>
        <TelephonyGlobalShortcut />
      </Provider>
    );

    const input = screen.getByTestId('telephony-shortcut-input');
    fireEvent.keyDown(input, {
      key: 'e',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(input).toHaveValue('Ctrl+Shift+E');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('Ctrl+Shift+D');
    expect(input).toHaveAttribute(
      'placeholder',
      'settings.options.telephonyShortcut.placeholder'
    );
  });

  it('shows registration failure feedback from main process status', () => {
    const store = makeStore({
      isTelephonyEnabled: true,
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
