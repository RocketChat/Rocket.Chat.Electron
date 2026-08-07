import { act } from '@testing-library/react';

import { DOWNLOAD_CREATED } from '../../../downloads/actions';
import { invoke } from '../../../ipc/renderer';
import { SIDE_BAR_DOWNLOADS_BUTTON_CLICKED } from '../../actions';
import {
  fireEvent,
  renderWithStore,
  screen,
  userEvent,
} from '../../test-utils';
import { DownloadsIndicator } from './DownloadsIndicator';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
      format: (value: unknown, format: string) => `${format}:${value}`,
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

jest.mock('../../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

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

const invokeMock = invoke as jest.MockedFunction<typeof invoke>;

const SESSION_START = Date.now();

const baseDownload = {
  itemId: 1,
  status: 'All' as const,
  fileName: 'report.pdf',
  receivedBytes: 500,
  totalBytes: 1000,
  startTime: SESSION_START + 1000,
  endTime: undefined,
  url: 'https://example.com/report.pdf',
  serverUrl: 'https://chat.example.com',
  serverTitle: 'Example Server',
  savePath: '/downloads/report.pdf',
  mimeType: 'application/pdf',
};

const buildState = (
  downloads: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {}
) => ({ downloads, isDownloadsPercentageEnabled: true, ...overrides }) as any;

describe('DownloadsIndicator', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    invokeMock.mockClear();
  });

  it('renders nothing when there are no downloads', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({}),
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is hidden for downloads from a previous session with no active items', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          startTime: SESSION_START - 100000,
          receivedBytes: 1000,
        },
      }),
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the pill and percent while a download is active', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    const pill = screen.getByRole('button');
    expect(pill).toBeInTheDocument();
    expect(screen.getByTestId('downloads-progress')).toHaveTextContent('50');
  });

  it('renders progress size text for a 0-byte-received download without the ??? sentinel', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'progressing',
          receivedBytes: 0,
          totalBytes: 901800,
        },
      }),
    });

    await user.click(screen.getByRole('button'));

    const sizeText = screen.getByText(/downloads\.item\.progressSize/, {
      exact: false,
    });
    expect(sizeText).toBeInTheDocument();
    expect(sizeText.textContent).not.toMatch(/\?\?\?/);
    expect(sizeText.textContent).toEqual(
      expect.stringContaining('"receivedBytes":0')
    );
    expect(sizeText.textContent).toEqual(
      expect.stringContaining('"totalBytes":901800')
    );
  });

  it('opens the popup listing recent downloads on click', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('invokes downloads/pause with the item id', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    await user.click(screen.getByRole('button'));
    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.pause' })
    );

    expect(invokeMock).toHaveBeenCalledWith('downloads/pause', 1);
  });

  it('dispatches the sidebar downloads action when "show all" is clicked', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    await user.click(screen.getByRole('button'));
    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.showAll' })
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED,
    });
  });

  it('closes the popup on Escape', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('report.pdf')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
  });

  it('closes the popup when clicking the backdrop', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    await user.click(screen.getByRole('button'));
    fireEvent.mouseDown(screen.getByTestId('downloads-panel-backdrop'));

    expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
  });

  it('labels a completed row with the show-in-folder action and invokes it on click', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          receivedBytes: 1000,
          startTime: SESSION_START + 1000,
        },
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );

    const row = screen.getByRole('button', {
      name: 'tabBar.downloads.showInFolder',
    });
    expect(row).toHaveAttribute('title', 'tabBar.downloads.showInFolder');

    await user.click(row);

    expect(invokeMock).toHaveBeenCalledWith('downloads/show-in-folder', 1);
  });

  it('shows the pill and canceled status for a cancelled download from this session, without a show-in-folder action', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'cancelled',
          startTime: SESSION_START + 1000,
        },
      }),
    });

    const pill = screen.getByRole('button', { name: 'tabBar.downloads.title' });
    expect(pill).toBeInTheDocument();

    await user.click(pill);

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('tabBar.downloads.canceled')).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'tabBar.downloads.showInFolder' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('report.pdf'));

    expect(invokeMock).not.toHaveBeenCalledWith('downloads/show-in-folder', 1);
  });

  it('shows the failed status for an interrupted download', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'interrupted',
          startTime: SESSION_START + 1000,
        },
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );

    expect(screen.getByText('tabBar.downloads.failed')).toBeInTheDocument();
  });

  it('shows a dismiss button in the open popup', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'completed', receivedBytes: 1000 },
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );

    expect(
      screen.getByRole('button', { name: 'tabBar.downloads.dismiss' })
    ).toBeInTheDocument();
  });

  it('hides the pill entirely when dismissed with only completed downloads', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          receivedBytes: 1000,
          startTime: SESSION_START,
        },
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );
    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.dismiss' })
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps the pill visible after dismiss while a download is still progressing', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    const pill = screen.getByRole('button', {
      name: 'tabBar.downloads.tooltip',
    });
    await user.click(pill);
    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.dismiss' })
    );

    expect(
      screen.getByRole('button', { name: 'tabBar.downloads.tooltip' })
    ).toBeInTheDocument();
  });

  it('re-shows the pill when a new download starts after dismissal', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          receivedBytes: 1000,
          startTime: SESSION_START,
        },
      }),
    });

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );
    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.dismiss' })
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    act(() => {
      store.dispatch({
        type: DOWNLOAD_CREATED,
        payload: {
          ...baseDownload,
          itemId: 2,
          state: 'progressing',
          startTime: Date.now() + 5000,
        },
      });
    });

    expect(
      screen.getByRole('button', { name: 'tabBar.downloads.tooltip' })
    ).toBeInTheDocument();
  });

  it('shows the mean progress across multiple active downloads, not a count', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          itemId: 1,
          state: 'progressing',
          receivedBytes: 200,
          totalBytes: 1000,
        },
        2: {
          ...baseDownload,
          itemId: 2,
          state: 'progressing',
          receivedBytes: 800,
          totalBytes: 1000,
        },
      }),
    });

    expect(screen.getByTestId('downloads-progress')).toHaveTextContent('50');
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('hides the percentage text when the setting is disabled', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState(
        { 1: { ...baseDownload, state: 'progressing' } },
        { isDownloadsPercentageEnabled: false }
      ),
    });

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByTestId('downloads-progress')).not.toBeInTheDocument();
  });

  it('shows the progress ring while a download is active', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    expect(screen.getByTestId('downloads-progress-ring')).toBeInTheDocument();
  });

  it('does not render the progress ring when there is no active download', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          receivedBytes: 1000,
          startTime: SESSION_START + 1000,
        },
      }),
    });

    expect(
      screen.queryByTestId('downloads-progress-ring')
    ).not.toBeInTheDocument();
  });

  it('shows the progress ring even when the percentage text setting is disabled', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState(
        { 1: { ...baseDownload, state: 'progressing' } },
        { isDownloadsPercentageEnabled: false }
      ),
    });

    expect(screen.getByTestId('downloads-progress-ring')).toBeInTheDocument();
    expect(screen.queryByTestId('downloads-progress')).not.toBeInTheDocument();
  });

  it('sets stroke-dashoffset on the progress arc to reflect the determinate progress', () => {
    const RING_RADIUS = 12;
    const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    const ring = screen.getByTestId('downloads-progress-ring');
    const [, progressArc] = ring.querySelectorAll('circle');
    const expectedOffset = CIRCUMFERENCE * (1 - 50 / 100);

    expect(Number(progressArc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      expectedOffset
    );
  });

  it('renders the ring in indeterminate mode when no active download has a measurable size', () => {
    const RING_RADIUS = 12;
    const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'progressing',
          receivedBytes: 0,
          totalBytes: 0,
        },
      }),
    });

    const ring = screen.getByTestId('downloads-progress-ring');
    const [, progressArc] = ring.querySelectorAll('circle');
    const expectedOffset = CIRCUMFERENCE * 0.75;

    expect(Number(progressArc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      expectedOffset
    );
  });

  it('shows the unseen-completed dot when a download completes while the popup is closed', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          receivedBytes: 1000,
          startTime: SESSION_START + 1000,
          endTime: Date.now() + 1000,
        },
      }),
    });

    expect(screen.getByTestId('downloads-unseen-dot')).toBeInTheDocument();
  });

  it('clears the unseen-completed dot once the popup is opened', async () => {
    const user = userEvent.setup();
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: {
          ...baseDownload,
          state: 'completed',
          receivedBytes: 1000,
          startTime: SESSION_START + 1000,
          endTime: Date.now() + 1000,
        },
      }),
    });

    expect(screen.getByTestId('downloads-unseen-dot')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );

    expect(
      screen.queryByTestId('downloads-unseen-dot')
    ).not.toBeInTheDocument();
  });

  describe('variant="chrome"', () => {
    const RING_RADIUS = 12;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    const TRAY_PATH = 'M5 20h14v-2H5v2z';
    const ARROW_PATH = 'M19 9h-4V3H9v6H5l7 7 7-7z';

    it('renders the chrome glyph svg while downloading', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      expect(screen.getByTestId('downloads-chrome-glyph')).toBeInTheDocument();
    });

    it('renders the shared progress ring overlay while downloading, with the arc dashoffset reflecting determinate progress', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const ring = screen.getByTestId('downloads-progress-ring');
      const [, progressArc] = ring.querySelectorAll('circle');
      const expectedOffset = RING_CIRCUMFERENCE * (1 - 50 / 100);

      expect(Number(progressArc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
        expectedOffset
      );
      expect(Number(progressArc.getAttribute('stroke-dasharray'))).toBeCloseTo(
        RING_CIRCUMFERENCE
      );
    });

    it('does not render the progress ring overlay while idle', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: {
            ...baseDownload,
            state: 'completed',
            receivedBytes: 1000,
            startTime: SESSION_START + 1000,
          },
        }),
      });

      expect(
        screen.queryByTestId('downloads-progress-ring')
      ).not.toBeInTheDocument();
    });

    it('renders no circles inside the glyph svg itself (the ring lives in the shared overlay)', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const glyph = screen.getByTestId('downloads-chrome-glyph');
      expect(glyph.querySelectorAll('circle')).toHaveLength(0);
    });

    it('renders only the arrow path (no tray) while downloading', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const glyph = screen.getByTestId('downloads-chrome-glyph');
      expect(glyph.querySelectorAll('path')).toHaveLength(1);
      expect(glyph.querySelector(`path[d="${TRAY_PATH}"]`)).toBeNull();
      expect(glyph.querySelector(`path[d="${ARROW_PATH}"]`)).not.toBeNull();
    });

    it('renders both the arrow and tray paths while idle', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: {
            ...baseDownload,
            state: 'completed',
            receivedBytes: 1000,
            startTime: SESSION_START + 1000,
          },
        }),
      });

      const glyph = screen.getByTestId('downloads-chrome-glyph');
      expect(glyph.querySelectorAll('path')).toHaveLength(2);
      expect(glyph.querySelector(`path[d="${TRAY_PATH}"]`)).not.toBeNull();
      expect(glyph.querySelector(`path[d="${ARROW_PATH}"]`)).not.toBeNull();
    });

    it('renders the downloading arrow at full size, with no shrink scale on its wrapping group', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const glyph = screen.getByTestId('downloads-chrome-glyph');
      const arrowPath = glyph.querySelector(`path[d="${ARROW_PATH}"]`);

      expect(arrowPath).not.toBeNull();
      let node: Element | null = arrowPath;
      while (node && node !== glyph) {
        const transform = node.getAttribute('transform');
        if (transform) {
          expect(transform).not.toMatch(/scale/);
        }
        node = node.parentElement;
      }
    });

    it('still shows the percentage text and the unseen dot', () => {
      renderWithStore(<DownloadsIndicator variant='chrome' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
          2: {
            ...baseDownload,
            itemId: 2,
            state: 'completed',
            receivedBytes: 1000,
            startTime: SESSION_START + 2000,
            endTime: Date.now() + 1000,
          },
        }),
      });

      expect(screen.getByTestId('downloads-progress')).toHaveTextContent('50');
      expect(screen.getByTestId('downloads-unseen-dot')).toBeInTheDocument();
    });
  });

  describe('variant="fuselage"', () => {
    const ICON_RING_RADIUS = 9;
    const ICON_RING_CIRCUMFERENCE = 2 * Math.PI * ICON_RING_RADIUS;

    it('renders the stock Fuselage download icon, same as the ring variant', () => {
      renderWithStore(<DownloadsIndicator variant='fuselage' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const button = screen.getByRole('button');
      expect(button.querySelector('.rcx-icon--name-download')).not.toBeNull();
    });

    it('renders the overlay with exactly one accent arc circle while downloading, with dashoffset reflecting determinate progress', () => {
      renderWithStore(<DownloadsIndicator variant='fuselage' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const ring = screen.getByTestId('downloads-progress-ring');
      const circles = ring.querySelectorAll('circle');
      expect(circles).toHaveLength(1);

      const [progressArc] = circles;
      expect(Number(progressArc.getAttribute('r'))).toBe(ICON_RING_RADIUS);

      const expectedOffset = ICON_RING_CIRCUMFERENCE * (1 - 50 / 100);
      expect(Number(progressArc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
        expectedOffset
      );
      expect(Number(progressArc.getAttribute('stroke-dasharray'))).toBeCloseTo(
        ICON_RING_CIRCUMFERENCE
      );
    });

    it('does not render the overlay while idle', () => {
      renderWithStore(<DownloadsIndicator variant='fuselage' />, {
        preloadedState: buildState({
          1: {
            ...baseDownload,
            state: 'completed',
            receivedBytes: 1000,
            startTime: SESSION_START + 1000,
          },
        }),
      });

      expect(
        screen.queryByTestId('downloads-progress-ring')
      ).not.toBeInTheDocument();
    });

    it('still shows the percentage text and the unseen dot', () => {
      renderWithStore(<DownloadsIndicator variant='fuselage' />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
          2: {
            ...baseDownload,
            itemId: 2,
            state: 'completed',
            receivedBytes: 1000,
            startTime: SESSION_START + 2000,
            endTime: Date.now() + 1000,
          },
        }),
      });

      expect(screen.getByTestId('downloads-progress')).toHaveTextContent('50');
      expect(screen.getByTestId('downloads-unseen-dot')).toBeInTheDocument();
    });
  });
});
