import {
  WINDOW_CONTROLS_CLOSE_CLICKED,
  WINDOW_CONTROLS_MAXIMIZE_CLICKED,
  WINDOW_CONTROLS_MINIMIZE_CLICKED,
} from '../../actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';
import { WindowControls } from './WindowControls';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

const buildState = (overrides: Record<string, unknown> = {}) =>
  ({
    rootWindowState: { maximized: false, fullscreen: false },
    ...overrides,
  }) as any;

describe('WindowControls', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('dispatches WINDOW_CONTROLS_MINIMIZE_CLICKED when the minimize button is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<WindowControls />, { preloadedState: buildState() });

    await user.click(
      screen.getByRole('button', {
        name: 'tabBar.windowControls.minimize',
      })
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WINDOW_CONTROLS_MINIMIZE_CLICKED,
    });
  });

  it('dispatches WINDOW_CONTROLS_MAXIMIZE_CLICKED when the maximize button is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<WindowControls />, { preloadedState: buildState() });

    await user.click(
      screen.getByRole('button', {
        name: 'tabBar.windowControls.maximize',
      })
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WINDOW_CONTROLS_MAXIMIZE_CLICKED,
    });
  });

  it('dispatches WINDOW_CONTROLS_CLOSE_CLICKED when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<WindowControls />, { preloadedState: buildState() });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.windowControls.close' })
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WINDOW_CONTROLS_CLOSE_CLICKED,
    });
  });

  it('renders window control buttons with white text color', () => {
    renderWithStore(<WindowControls />, { preloadedState: buildState() });

    const minimizeButton = screen.getByRole('button', {
      name: 'tabBar.windowControls.minimize',
    });

    expect(minimizeButton).toHaveStyle({ color: '#ffffff' });
  });

  it('shows the maximize label and glyph when the window is not maximized', () => {
    renderWithStore(<WindowControls />, {
      preloadedState: buildState({
        rootWindowState: { maximized: false, fullscreen: false },
      }),
    });

    expect(
      screen.getByRole('button', { name: 'tabBar.windowControls.maximize' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'tabBar.windowControls.restore' })
    ).not.toBeInTheDocument();
  });

  it('shows the restore label when rootWindowState.maximized is true', () => {
    renderWithStore(<WindowControls />, {
      preloadedState: buildState({
        rootWindowState: { maximized: true, fullscreen: false },
      }),
    });

    expect(
      screen.getByRole('button', { name: 'tabBar.windowControls.restore' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'tabBar.windowControls.maximize' })
    ).not.toBeInTheDocument();
  });

  it('shows the restore label when rootWindowState.fullscreen is true', () => {
    renderWithStore(<WindowControls />, {
      preloadedState: buildState({
        rootWindowState: { maximized: false, fullscreen: true },
      }),
    });

    expect(
      screen.getByRole('button', { name: 'tabBar.windowControls.restore' })
    ).toBeInTheDocument();
  });

  it('dispatches WINDOW_CONTROLS_MAXIMIZE_CLICKED from the restore button when maximized', async () => {
    const user = userEvent.setup();
    renderWithStore(<WindowControls />, {
      preloadedState: buildState({
        rootWindowState: { maximized: true, fullscreen: false },
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.windowControls.restore' })
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WINDOW_CONTROLS_MAXIMIZE_CLICKED,
    });
  });
});
