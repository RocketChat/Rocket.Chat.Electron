import { screen, render, userEvent } from '../../test-utils';
import WorkspaceTab from './WorkspaceTab';

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

const baseProps = {
  url: 'https://open.rocket.chat/',
  title: 'Open',
  favicon: null,
  isSelected: false,
  compact: false,
  shortcutNumber: null,
  isShortcutVisible: false,
  tabIndex: 0 as const,
  onDragStart: jest.fn(),
  onDragEnd: jest.fn(),
  onDragEnter: jest.fn(),
  onDrop: jest.fn(),
};

describe('WorkspaceTab audio indicator', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('does not render a speaker glyph when neither isAudible nor isAudioMuted is set', () => {
    render(<WorkspaceTab {...baseProps} orientation='horizontal' />);

    expect(
      screen.queryByRole('button', { name: 'sidebar.tooltips.muteWorkspace' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: 'sidebar.tooltips.unmuteWorkspace',
      })
    ).not.toBeInTheDocument();
  });

  it('renders a speaker glyph with the mute label when the tab is audible', () => {
    render(<WorkspaceTab {...baseProps} orientation='horizontal' isAudible />);

    const speaker = screen.getByRole('button', {
      name: 'sidebar.tooltips.muteWorkspace',
    });
    expect(speaker).toBeInTheDocument();
    expect(speaker).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders a speaker glyph with the unmute label and pressed state when muted', () => {
    render(
      <WorkspaceTab {...baseProps} orientation='horizontal' isAudioMuted />
    );

    const speaker = screen.getByRole('button', {
      name: 'sidebar.tooltips.unmuteWorkspace',
    });
    expect(speaker).toBeInTheDocument();
    expect(speaker).toHaveAttribute('aria-pressed', 'true');
    expect(speaker).toHaveAttribute('data-muted', 'true');
  });

  it('does not render the speaker glyph in the vertical sidebar layout even when audible', () => {
    render(<WorkspaceTab {...baseProps} orientation='vertical' isAudible />);

    expect(
      screen.queryByRole('button', { name: 'sidebar.tooltips.muteWorkspace' })
    ).not.toBeInTheDocument();
  });

  it('dispatches SIDE_BAR_SERVER_TOGGLE_MUTE and not SIDE_BAR_SERVER_SELECTED when the speaker is clicked', async () => {
    const user = userEvent.setup();
    render(<WorkspaceTab {...baseProps} orientation='horizontal' isAudible />);

    const speaker = screen.getByRole('button', {
      name: 'sidebar.tooltips.muteWorkspace',
    });
    await user.click(speaker);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'side-bar/server-toggle-mute',
      payload: baseProps.url,
    });
  });
});
