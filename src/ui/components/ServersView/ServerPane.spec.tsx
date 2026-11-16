import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { forwardRef } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { SERVER_VIEW_BOOTED_CHANNEL } from '../../../servers/common';
import {
  LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
  MENU_BAR_FIND_IN_PAGE_CLICKED,
} from '../../actions';
import { ServerPane } from './ServerPane';

const listeners: Array<(action: { type: string }) => void> = [];

jest.mock('../../../store', () => ({
  listen: (
    type: string,
    listener: (action: { type: string }) => void
  ): (() => void) => {
    const handler = (action: { type: string }): void => {
      if (action.type === type) {
        listener(action);
      }
    };
    listeners.push(handler);
    return () => {
      const index = listeners.indexOf(handler);
      if (index !== -1) listeners.splice(index, 1);
    };
  },
}));

const emit = (type: string): void => {
  act(() => {
    listeners.slice().forEach((listener) => listener({ type }));
  });
};

jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn(),
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

export const mockWebviewFns = {
  findInPage: jest.fn(),
  stopFindInPage: jest.fn(),
  getWebContentsId: jest.fn(() => 1),
  focus: jest.fn(),
  blur: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

jest.mock('./styles', () => ({
  StyledWebView: forwardRef((props: any, ref: any) => (
    <div
      ref={(node: any) => {
        if (node) {
          Object.assign(node, mockWebviewFns);
        }
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      {...props}
    />
  )),
  Wrapper: ({ children, isVisible, ...props }: any) => (
    <div
      data-testid='server-pane'
      style={{ display: isVisible ? 'flex' : 'none' }}
      {...props}
    >
      {children}
    </div>
  ),
}));

const makeStore = () => createStore((s = {}) => s as any);

describe('ServerPane', () => {
  beforeEach(() => {
    listeners.length = 0;
    Object.values(mockWebviewFns).forEach((fn) => fn.mockClear());
  });

  it.each([true, false])(
    'keeps a hidden workspace mounted and restores only the selected pane (%s)',
    (isSelected) => {
      const hidden = jest
        .spyOn(document, 'hidden', 'get')
        .mockReturnValue(true);
      try {
        const { container, unmount } = render(
          <Provider store={makeStore()}>
            <ServerPane
              lastPath='https://open.rocket.chat/channel/general'
              serverUrl='https://open.rocket.chat'
              isSelected={isSelected}
              isFailed={false}
              isSupported
              title='Community'
            />
          </Provider>
        );
        const pane = screen.getByTestId('server-pane');
        const view = container.querySelector('[partition]');
        expect(view).not.toBeNull();
        // Initial rendering must stay available until the web client's boot signal.
        expect(pane).toHaveStyle({ display: isSelected ? 'flex' : 'none' });
        const boot = mockWebviewFns.addEventListener.mock.calls.find(
          ([event]) => event === 'ipc-message'
        )?.[1];
        expect(boot).toBeDefined();
        act(() => boot({ channel: 'unrelated' }));
        expect(pane).toHaveStyle({ display: isSelected ? 'flex' : 'none' });
        act(() => boot({ channel: SERVER_VIEW_BOOTED_CHANNEL }));
        expect(pane).toHaveStyle({ display: 'none' });
        hidden.mockReturnValue(false);
        fireEvent(document, new Event('visibilitychange'));
        expect(pane).toHaveStyle({ display: isSelected ? 'flex' : 'none' });
        expect(container.querySelector('[partition]')).toBe(view);
        hidden.mockReturnValue(true);
        fireEvent(document, new Event('visibilitychange'));
        expect(pane).toHaveStyle({ display: 'none' });
        expect(container.querySelector('[partition]')).toBe(view);
        const navigate = mockWebviewFns.addEventListener.mock.calls.find(
          ([event]) => event === 'did-navigate'
        )?.[1];
        act(() => navigate());
        expect(pane).toHaveStyle({ display: isSelected ? 'flex' : 'none' });
        act(() => boot({ channel: SERVER_VIEW_BOOTED_CHANNEL }));
        expect(pane).toHaveStyle({ display: 'none' });
        expect(container.querySelector('[partition]')).toBe(view);
        unmount();
        expect(mockWebviewFns.removeEventListener).toHaveBeenCalledWith(
          'ipc-message',
          boot
        );
        expect(mockWebviewFns.removeEventListener).toHaveBeenCalledWith(
          'did-navigate',
          navigate
        );
      } finally {
        hidden.mockRestore();
      }
    }
  );

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

  it('reloads a failed server view when the network comes back', () => {
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

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(spy).toHaveBeenCalledWith({
      type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
      payload: { url: 'https://open.rocket.chat' },
    });
  });

  it('does not reload a loaded server view when the network comes back', () => {
    const store = makeStore();
    const spy = jest.spyOn(store, 'dispatch');
    render(
      <Provider store={store}>
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

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(spy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
      })
    );
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

  it('does not render the find bar by default', () => {
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
    expect(
      screen.queryByPlaceholderText('findInPage.placeholder')
    ).not.toBeInTheDocument();
  });

  it('opens the find bar for the selected pane when the menu action fires', () => {
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

    emit(MENU_BAR_FIND_IN_PAGE_CLICKED);

    const input = screen.getByPlaceholderText('findInPage.placeholder');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('keeps focus on the find input when the window regains focus while the bar is open', () => {
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

    emit(MENU_BAR_FIND_IN_PAGE_CLICKED);

    const input = screen.getByPlaceholderText('findInPage.placeholder');
    expect(input).toHaveFocus();

    mockWebviewFns.focus.mockClear();
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockWebviewFns.focus).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
  });

  it('does not open the find bar for an unselected pane', () => {
    render(
      <Provider store={makeStore()}>
        <ServerPane
          lastPath={undefined}
          serverUrl='https://open.rocket.chat'
          isSelected={false}
          isFailed={false}
          isSupported
          title='Community'
        />
      </Provider>
    );

    emit(MENU_BAR_FIND_IN_PAGE_CLICKED);

    expect(
      screen.queryByPlaceholderText('findInPage.placeholder')
    ).not.toBeInTheDocument();
  });

  it('stops find in page on the webview when the bar is closed', () => {
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

    emit(MENU_BAR_FIND_IN_PAGE_CLICKED);
    fireEvent.click(screen.getByTitle('findInPage.close'));

    expect(mockWebviewFns.stopFindInPage).toHaveBeenCalledWith(
      'clearSelection'
    );
    expect(
      screen.queryByPlaceholderText('findInPage.placeholder')
    ).not.toBeInTheDocument();
  });

  it('closes the find bar without focusing the webview when the pane is deselected', () => {
    const props = {
      lastPath: undefined,
      serverUrl: 'https://open.rocket.chat',
      isFailed: false,
      isSupported: true,
      title: 'Community',
    };
    const { rerender } = render(
      <Provider store={makeStore()}>
        <ServerPane {...props} isSelected />
      </Provider>
    );

    emit(MENU_BAR_FIND_IN_PAGE_CLICKED);
    expect(
      screen.getByPlaceholderText('findInPage.placeholder')
    ).toBeInTheDocument();

    mockWebviewFns.focus.mockClear();
    rerender(
      <Provider store={makeStore()}>
        <ServerPane {...props} isSelected={false} />
      </Provider>
    );

    expect(mockWebviewFns.stopFindInPage).toHaveBeenCalledWith(
      'clearSelection'
    );
    expect(
      screen.queryByPlaceholderText('findInPage.placeholder')
    ).not.toBeInTheDocument();
    expect(mockWebviewFns.focus).not.toHaveBeenCalled();
  });
});
