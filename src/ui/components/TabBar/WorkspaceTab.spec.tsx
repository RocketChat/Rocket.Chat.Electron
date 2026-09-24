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

  const querySpeaker = (): HTMLElement | null =>
    document.querySelector('[data-muted]');

  it('does not render a speaker glyph when neither isAudible nor isAudioMuted is set', () => {
    render(<WorkspaceTab {...baseProps} orientation='horizontal' />);

    expect(querySpeaker()).not.toBeInTheDocument();
  });

  it('renders an unmuted speaker glyph when the tab is audible', () => {
    render(<WorkspaceTab {...baseProps} orientation='horizontal' isAudible />);

    expect(querySpeaker()).toHaveAttribute('data-muted', 'false');
  });

  it('renders a muted speaker glyph when the tab is muted', () => {
    render(
      <WorkspaceTab {...baseProps} orientation='horizontal' isAudioMuted />
    );

    expect(querySpeaker()).toHaveAttribute('data-muted', 'true');
  });

  it('keeps the speaker glyph out of the accessibility tree so the tab button has no interactive descendant', () => {
    render(<WorkspaceTab {...baseProps} orientation='horizontal' isAudible />);

    expect(querySpeaker()).toHaveAttribute('aria-hidden', 'true');
    expect(querySpeaker()).not.toHaveAttribute('tabindex');
    expect(
      screen.getByRole('tab').querySelectorAll('button, [role="button"]')
    ).toHaveLength(0);
  });

  it('does not render the speaker glyph in the vertical sidebar layout even when audible', () => {
    render(<WorkspaceTab {...baseProps} orientation='vertical' isAudible />);

    expect(querySpeaker()).not.toBeInTheDocument();
  });

  it('dispatches SIDE_BAR_SERVER_TOGGLE_MUTE and not SIDE_BAR_SERVER_SELECTED when the speaker is clicked', async () => {
    const user = userEvent.setup();
    render(<WorkspaceTab {...baseProps} orientation='horizontal' isAudible />);

    await user.click(querySpeaker() as HTMLElement);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'side-bar/server-toggle-mute',
      payload: baseProps.url,
    });
  });
});

describe('WorkspaceTab keyboard context menu', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const renderFocusedTab = (): HTMLElement => {
    render(<WorkspaceTab {...baseProps} orientation='horizontal' />);
    const tab = screen.getByRole('tab');
    jest.spyOn(tab, 'getBoundingClientRect').mockReturnValue({
      left: 120,
      bottom: 48,
    } as DOMRect);
    tab.focus();
    return tab;
  };

  it('opens the context menu anchored to the tab on the ContextMenu key', async () => {
    const user = userEvent.setup();
    renderFocusedTab();

    await user.keyboard('{ContextMenu}');

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'server-context-menu/triggered',
      payload: { x: 120, y: 48, url: baseProps.url },
    });
  });

  it('opens the context menu anchored to the tab on Shift+F10', async () => {
    const user = userEvent.setup();
    renderFocusedTab();

    await user.keyboard('{Shift>}{F10}{/Shift}');

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'server-context-menu/triggered',
      payload: { x: 120, y: 48, url: baseProps.url },
    });
  });

  it('still selects the workspace on Enter without opening the context menu', async () => {
    const user = userEvent.setup();
    renderFocusedTab();

    await user.keyboard('{Enter}');

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'side-bar/server-selected',
      payload: baseProps.url,
    });
  });
});
