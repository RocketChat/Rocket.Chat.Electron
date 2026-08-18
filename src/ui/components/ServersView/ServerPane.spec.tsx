import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED } from '../../actions';
import { ServerPane } from './ServerPane';

jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('./ErrorView', () => ({
  __esModule: true,
  default: ({ isFailed, onReload }: any) =>
    isFailed ? (
      <button type='button' onClick={onReload}>
        error-reload
      </button>
    ) : null,
}));

jest.mock('./UnsupportedServer', () => ({
  __esModule: true,
  default: () => <div data-testid='unsupported' />,
}));

jest.mock('./styles', () => ({
  DocumentViewerWrapper: ({ children }: any) => <div>{children}</div>,
  StyledWebView: 'div',
  Wrapper: ({ children, ...props }: any) => (
    <div data-testid='server-pane' {...props}>
      {children}
    </div>
  ),
}));

const makeStore = () => createStore((s = {}) => s as any);

describe('ServerPane', () => {
  it('renders selected server pane shell', () => {
    render(
      <Provider store={makeStore()}>
        <ServerPane
          lastPath={undefined}
          serverUrl='https://open.rocket.chat'
          isSelected
          isFailed={false}
          isSupported
          title='Community'
        />
      </Provider>
    );
    expect(screen.getByTestId('server-pane')).toBeInTheDocument();
  });

  it('shows error view when failed and reloads', () => {
    const store = makeStore();
    const spy = jest.spyOn(store, 'dispatch');
    render(
      <Provider store={store}>
        <ServerPane
          lastPath={undefined}
          serverUrl='https://open.rocket.chat'
          isSelected
          isFailed
          isSupported
          title='Community'
        />
      </Provider>
    );
    fireEvent.click(screen.getByText('error-reload'));
    expect(spy).toHaveBeenCalledWith({
      type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
      payload: { url: 'https://open.rocket.chat' },
    });
  });

  it('shows unsupported server when not supported', () => {
    render(
      <Provider store={makeStore()}>
        <ServerPane
          lastPath={undefined}
          serverUrl='https://open.rocket.chat'
          isSelected
          isFailed={false}
          isSupported={false}
          supportedVersionsFetchState='success'
          title='Old'
        />
      </Provider>
    );
    expect(screen.getByTestId('unsupported')).toBeInTheDocument();
  });
});
