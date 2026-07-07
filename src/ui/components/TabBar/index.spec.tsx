import { act } from '@testing-library/react';

import { TabBar } from '.';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_SERVER_SELECTED,
} from '../../actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';

// The layout hook debounces ResizeObserver updates through a
// requestAnimationFrame. With fake timers installed, flush it right after
// render so `availableWidth` reflects the mocked tablist width before assertions run.
const renderTabBar = (
  ...args: Parameters<typeof renderWithStore>
): ReturnType<typeof renderWithStore> => {
  const result = renderWithStore(...args);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  return result;
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count !== undefined ? `${key}:${options.count}` : key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

let mockTabListWidth = 1000;

class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: { width: mockTabListWidth } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }

  unobserve() {}

  disconnect() {}
}

const buildState = (overrides: Record<string, unknown> = {}) =>
  ({
    servers: [
      { url: 'https://a.rocket.chat/', title: 'Server A' },
      { url: 'https://b.rocket.chat/', title: 'Server B' },
    ],
    currentView: { url: 'https://a.rocket.chat/' },
    isAddNewServersEnabled: true,
    isTransparentWindowEnabled: false,
    rootWindowState: { fullscreen: false },
    ...overrides,
  }) as any;

describe('TabBar', () => {
  const originalResizeObserver = (global as any).ResizeObserver;

  beforeAll(() => {
    (global as any).ResizeObserver = MockResizeObserver;
  });

  afterAll(() => {
    (global as any).ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    mockTabListWidth = 1000;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders one tab per server', () => {
    renderTabBar(<TabBar />, { preloadedState: buildState() });

    expect(screen.getByText('Server A')).toBeInTheDocument();
    expect(screen.getByText('Server B')).toBeInTheDocument();
  });

  it('marks the active server tab as selected', () => {
    renderTabBar(<TabBar />, { preloadedState: buildState() });

    const tabs = screen.getAllByRole('tab');
    const selected = tabs.filter(
      (tab) => tab.getAttribute('aria-selected') === 'true'
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Server A');
  });

  it('dispatches SIDE_BAR_SERVER_SELECTED with the url when a tab is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTabBar(<TabBar />, { preloadedState: buildState() });

    await user.click(screen.getByText('Server B'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_SELECTED,
      payload: 'https://b.rocket.chat/',
    });
  });

  it('dispatches SIDE_BAR_ADD_NEW_SERVER_CLICKED when the add button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTabBar(<TabBar />, { preloadedState: buildState() });

    await user.click(screen.getByTitle('tabBar.addWorkspace'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_ADD_NEW_SERVER_CLICKED,
    });
  });

  it('hides the add button when adding servers is disabled', () => {
    renderTabBar(<TabBar />, {
      preloadedState: buildState({ isAddNewServersEnabled: false }),
    });

    expect(screen.queryByTitle('tabBar.addWorkspace')).not.toBeInTheDocument();
  });

  it('caps the unread mention badge display at 99+', () => {
    renderTabBar(<TabBar />, {
      preloadedState: buildState({
        servers: [
          { url: 'https://a.rocket.chat/', title: 'Server A', badge: 150 },
        ],
      }),
    });

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders initials as a fallback when there is no favicon', () => {
    renderTabBar(<TabBar />, {
      preloadedState: buildState({
        servers: [{ url: 'https://a.rocket.chat/', title: 'Server A' }],
      }),
    });

    expect(screen.getByText('SA')).toBeInTheDocument();
  });

  it('dispatches SIDE_BAR_CONTEXT_MENU_TRIGGERED on context menu', () => {
    renderTabBar(<TabBar />, { preloadedState: buildState() });

    const tab = screen.getByText('Server A').closest('[role="tab"]');
    expect(tab).not.toBeNull();

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    tab?.dispatchEvent(event);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_CONTEXT_MENU_TRIGGERED,
      payload: 'https://a.rocket.chat/',
    });
  });

  it('renders with zero servers without crashing', () => {
    renderTabBar(<TabBar />, {
      preloadedState: buildState({
        servers: [],
        currentView: 'add-new-server',
      }),
    });

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('moves focus to the next tab on ArrowRight', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderTabBar(<TabBar />, { preloadedState: buildState() });

    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    await user.keyboard('{ArrowRight}');

    expect(tabs[1]).toHaveFocus();
  });

  it('falls back tabindex to the first tab when no server is selected', () => {
    renderTabBar(<TabBar />, {
      preloadedState: buildState({ currentView: 'settings' }),
    });

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
  });

  it('shows a warning badge for logged-out servers', () => {
    renderTabBar(<TabBar />, {
      preloadedState: buildState({
        servers: [
          {
            url: 'https://a.rocket.chat/',
            title: 'Server A',
            userLoggedIn: false,
          },
        ],
      }),
    });

    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('renders more tabs when the add button is disabled', () => {
    mockTabListWidth = 130;

    const servers = [
      { url: 'https://a.rocket.chat/', title: 'Server A' },
      { url: 'https://b.rocket.chat/', title: 'Server B' },
      { url: 'https://c.rocket.chat/', title: 'Server C' },
    ];

    renderTabBar(<TabBar />, {
      preloadedState: buildState({
        servers,
        isAddNewServersEnabled: false,
      }),
    });

    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
