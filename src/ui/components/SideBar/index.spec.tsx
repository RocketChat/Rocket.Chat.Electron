import { SideBar } from '.';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
} from '../../actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';

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

// ServerButton pulls in avatars, the action dropdown and Fuselage portal
// machinery that is irrelevant to SideBar's own composition. Stub it down to a
// node that exposes the url it was handed so we can assert that one button is
// rendered per server.
jest.mock('./ServerButton', () => ({
  __esModule: true,
  default: ({ url, isSelected }: { url: string; isSelected: boolean }) => (
    <div
      data-testid='server-button'
      data-url={url}
      data-selected={isSelected}
    />
  ),
}));

const buildState = (overrides: Record<string, unknown> = {}) =>
  ({
    servers: [
      { url: 'https://a.rocket.chat/', title: 'Server A' },
      { url: 'https://b.rocket.chat/', title: 'Server B' },
    ],
    currentView: { url: 'https://a.rocket.chat/' },
    isAddNewServersEnabled: true,
    isTransparentWindowEnabled: false,
    navigationLayout: 'sidebar',
    ...overrides,
  }) as any;

describe('SideBar', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders one server button per server in state', () => {
    renderWithStore(<SideBar />, { preloadedState: buildState() });

    const buttons = screen.getAllByTestId('server-button');
    expect(buttons).toHaveLength(2);
    expect(buttons.map((b) => b.getAttribute('data-url'))).toEqual([
      'https://a.rocket.chat/',
      'https://b.rocket.chat/',
    ]);
  });

  it('marks the server matching the current view as selected', () => {
    renderWithStore(<SideBar />, { preloadedState: buildState() });

    const buttons = screen.getAllByTestId('server-button');
    const selected = buttons.filter(
      (b) => b.getAttribute('data-selected') === 'true'
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('data-url')).toBe('https://a.rocket.chat/');
  });

  it('renders the add-server button when adding servers is enabled', () => {
    renderWithStore(<SideBar />, { preloadedState: buildState() });

    expect(
      screen.getByTitle('sidebar.tooltips.addWorkspace')
    ).toBeInTheDocument();
  });

  it('hides the add-server button when adding servers is disabled', () => {
    renderWithStore(<SideBar />, {
      preloadedState: buildState({ isAddNewServersEnabled: false }),
    });

    expect(
      screen.queryByTitle('sidebar.tooltips.addWorkspace')
    ).not.toBeInTheDocument();
  });

  it('dispatches the add-new-server action when the add button is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<SideBar />, { preloadedState: buildState() });

    await user.click(screen.getByTitle('sidebar.tooltips.addWorkspace'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_ADD_NEW_SERVER_CLICKED,
    });
  });

  it('shows the server column when the sidebar is enabled and servers exist', () => {
    renderWithStore(<SideBar />, { preloadedState: buildState() });

    const wrapper = document.querySelector('.rcx-sidebar--main')
      ?.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ display: 'flex' });
  });

  it('collapses the server column when navigationLayout is tabs', () => {
    renderWithStore(<SideBar />, {
      preloadedState: buildState({ navigationLayout: 'tabs' }),
    });

    const wrapper = document.querySelector('.rcx-sidebar--main')
      ?.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ display: 'none' });
  });

  it('collapses the server column when there are no servers', () => {
    renderWithStore(<SideBar />, {
      preloadedState: buildState({
        servers: [],
        currentView: 'add-new-server',
      }),
    });

    expect(screen.queryByTestId('server-button')).not.toBeInTheDocument();
    const wrapper = document.querySelector('.rcx-sidebar--main')
      ?.firstElementChild as HTMLElement;
    expect(wrapper).toHaveStyle({ display: 'none' });
  });

  it('dispatches downloads and settings actions from the settings menu', async () => {
    const user = userEvent.setup();
    renderWithStore(<SideBar />, { preloadedState: buildState() });

    await user.click(screen.getByTitle('sidebar.tooltips.settingsMenu'));
    await user.click(screen.getByText('sidebar.downloads'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
    });

    await user.click(screen.getByTitle('sidebar.tooltips.settingsMenu'));
    await user.click(screen.getByText('sidebar.settings'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SETTINGS_BUTTON_CLICKED,
    });
  });
});
