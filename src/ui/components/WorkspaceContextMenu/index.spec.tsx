import { useRef } from 'react';

import WorkspaceContextMenu from '.';
import {
  SIDE_BAR_ADD_NEW_SERVER_CLICKED,
  SIDE_BAR_SERVER_RELOAD,
  SIDE_BAR_SERVER_COPY_URL,
  SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
  SIDE_BAR_SERVER_FORCE_RELOAD,
  SIDE_BAR_SERVER_REMOVE,
  OPEN_SERVER_INFO_MODAL,
} from '../../actions';
import { render, screen, userEvent } from '../../test-utils';

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

jest.mock('../SideBar/ServerInfoDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid='server-info-dropdown' />,
}));

// Fuselage's <Dropdown> resolves to its mobile variant under jsdom (matchMedia
// has no real layout) and renders its children into an unreachable portal/tile.
// Replace only that component with an inline passthrough so the menu Options
// render in the tree; every other Fuselage component stays real.
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage');
  return {
    __esModule: true,
    ...actual,
    Dropdown: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='dropdown'>{children}</div>
    ),
  };
});

const Wrapper = (
  overrides: Partial<React.ComponentProps<typeof WorkspaceContextMenu>> = {}
) => {
  const reference = useRef(null);
  const target = useRef(null);

  return (
    <WorkspaceContextMenu
      reference={reference}
      target={target}
      url='https://open.rocket.chat'
      onClose={jest.fn()}
      {...overrides}
    />
  );
};

describe('WorkspaceContextMenu', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders the workspace title and the standard action items', () => {
    render(<Wrapper />);

    expect(screen.getByText('sidebar.item.workspace')).toBeInTheDocument();
    expect(screen.getByText('sidebar.item.reload')).toBeInTheDocument();
    expect(screen.getByText('sidebar.item.copyCurrentUrl')).toBeInTheDocument();
    expect(screen.getByText('sidebar.item.openDevTools')).toBeInTheDocument();
    expect(screen.getByText('sidebar.item.serverInfo')).toBeInTheDocument();
    expect(
      screen.getByText('sidebar.item.reloadClearingCache')
    ).toBeInTheDocument();
    expect(screen.getByText('sidebar.item.remove')).toBeInTheDocument();
  });

  it('does not render the Add workspace option by default', () => {
    render(<Wrapper />);

    expect(
      screen.queryByText('sidebar.item.addWorkspace')
    ).not.toBeInTheDocument();
  });

  it('renders the Add workspace option when showAddWorkspace is true', () => {
    render(<Wrapper showAddWorkspace />);

    expect(screen.getByText('sidebar.item.addWorkspace')).toBeInTheDocument();
  });

  it('dispatches SIDE_BAR_ADD_NEW_SERVER_CLICKED when Add workspace is clicked', async () => {
    const user = userEvent.setup();
    render(<Wrapper showAddWorkspace />);

    await user.click(screen.getByText('sidebar.item.addWorkspace'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_ADD_NEW_SERVER_CLICKED,
    });
  });

  it('renders the Remove option with the danger variant', () => {
    render(<Wrapper />);

    const removeOption = screen.getByText('sidebar.item.remove').closest('li');
    expect(removeOption).toHaveClass('rcx-option--danger');
  });

  it('dispatches reload with the url when Reload is clicked', async () => {
    const user = userEvent.setup();
    render(<Wrapper url='https://open.rocket.chat' />);

    await user.click(screen.getByText('sidebar.item.reload'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_RELOAD,
      payload: 'https://open.rocket.chat',
    });
  });

  it('dispatches copy-url, dev-tools, force-reload and remove actions', async () => {
    const user = userEvent.setup();
    render(<Wrapper url='https://open.rocket.chat' />);

    await user.click(screen.getByText('sidebar.item.copyCurrentUrl'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_COPY_URL,
      payload: 'https://open.rocket.chat',
    });

    await user.click(screen.getByText('sidebar.item.openDevTools'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
      payload: 'https://open.rocket.chat',
    });

    await user.click(screen.getByText('sidebar.item.reloadClearingCache'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_FORCE_RELOAD,
      payload: 'https://open.rocket.chat',
    });

    await user.click(screen.getByText('sidebar.item.remove'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_SERVER_REMOVE,
      payload: 'https://open.rocket.chat',
    });
  });

  it('dispatches the open-server-info-modal action with the server details', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper
        url='https://open.rocket.chat'
        version='6.5.0'
        exchangeUrl='https://exchange.example.com'
        isSupportedVersion
        supportedVersionsSource='cloud'
        supportedVersionsFetchState='success'
      />
    );

    await user.click(screen.getByText('sidebar.item.serverInfo'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: OPEN_SERVER_INFO_MODAL,
      payload: {
        url: 'https://open.rocket.chat',
        version: '6.5.0',
        exchangeUrl: 'https://exchange.example.com',
        isSupportedVersion: true,
        supportedVersionsSource: 'cloud',
        supportedVersionsFetchState: 'success',
        supportedVersions: undefined,
      },
    });
  });
});
