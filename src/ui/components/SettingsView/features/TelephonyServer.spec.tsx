import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Key } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../../store/rootReducer';
import { TELEPHONY_PREFERRED_SERVER_SET } from '../../../../telephony/actions';
import { TelephonyServer } from './TelephonyServer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Fuselage Select is a custom ARIA dropdown — mock it to a native <select>
// so tests can drive onChange without user-event or ARIA interaction complexity.
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage');
  return {
    ...actual,
    Select: ({
      options,
      value,
      onChange,
    }: {
      options: [string, string][];
      value: string;
      onChange: (key: Key) => void;
    }) => (
      <select
        data-testid='telephony-select'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    ),
  };
});

type PartialState = Pick<RootState, 'servers' | 'telephonyPreferredServer'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

describe('TelephonyServer', () => {
  it('renders nothing when servers is empty', () => {
    const store = makeStore({ servers: [], telephonyPreferredServer: null });
    const { container } = render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when servers.length === 1', () => {
    const store = makeStore({
      servers: [{ url: 'https://chat.example.com', title: 'Example' }],
      telephonyPreferredServer: null,
    });
    const { container } = render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Select with N+1 options when servers.length >= 2', () => {
    const store = makeStore({
      servers: [
        { url: 'https://chat.alpha.com', title: 'Alpha' },
        { url: 'https://chat.beta.com', title: 'Beta' },
      ],
      telephonyPreferredServer: null,
    });
    render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    const select = screen.getByTestId('telephony-select');
    const options = select.querySelectorAll('option');
    // auto + 2 servers = 3
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('auto');
    expect(options[1]).toHaveValue('https://chat.alpha.com');
    expect(options[2]).toHaveValue('https://chat.beta.com');
  });

  it('shows telephonyPreferredServer as current Select value', () => {
    const store = makeStore({
      servers: [
        { url: 'https://chat.alpha.com', title: 'Alpha' },
        { url: 'https://chat.beta.com', title: 'Beta' },
      ],
      telephonyPreferredServer: 'https://chat.beta.com',
    });
    render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    const select = screen.getByTestId<HTMLSelectElement>('telephony-select');
    expect(select.value).toBe('https://chat.beta.com');
  });

  it('shows "auto" as Select value when telephonyPreferredServer is null', () => {
    const store = makeStore({
      servers: [
        { url: 'https://chat.alpha.com', title: 'Alpha' },
        { url: 'https://chat.beta.com', title: 'Beta' },
      ],
      telephonyPreferredServer: null,
    });
    render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    const select = screen.getByTestId<HTMLSelectElement>('telephony-select');
    expect(select.value).toBe('auto');
  });

  it('onChange to a server URL dispatches TELEPHONY_PREFERRED_SERVER_SET with the URL', () => {
    const store = makeStore({
      servers: [
        { url: 'https://chat.alpha.com', title: 'Alpha' },
        { url: 'https://chat.beta.com', title: 'Beta' },
      ],
      telephonyPreferredServer: null,
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    const select = screen.getByTestId('telephony-select');
    fireEvent.change(select, { target: { value: 'https://chat.alpha.com' } });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_PREFERRED_SERVER_SET,
      payload: 'https://chat.alpha.com',
    });
  });

  it('onChange to "auto" dispatches TELEPHONY_PREFERRED_SERVER_SET with null payload', () => {
    const store = makeStore({
      servers: [
        { url: 'https://chat.alpha.com', title: 'Alpha' },
        { url: 'https://chat.beta.com', title: 'Beta' },
      ],
      telephonyPreferredServer: 'https://chat.alpha.com',
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    const select = screen.getByTestId('telephony-select');
    fireEvent.change(select, { target: { value: 'auto' } });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_PREFERRED_SERVER_SET,
      payload: null,
    });
  });

  it('falls back to hostname when server has no title', () => {
    const store = makeStore({
      servers: [
        { url: 'https://example.rocketchat.com' },
        { url: 'https://chat.beta.com', title: 'Beta' },
      ],
      telephonyPreferredServer: null,
    });
    render(
      <Provider store={store}>
        <TelephonyServer />
      </Provider>
    );
    const option = screen.getByRole('option', {
      name: 'example.rocketchat.com',
    });
    expect(option).toBeInTheDocument();
  });
});
