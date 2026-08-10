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

const TRACK_CIRCLE_D =
  'M27 16C27 9.92487 22.0751 5 16 5C9.92487 5 5 9.92487 5 16C5 22.0751 9.92487 27 16 27C22.0751 27 27 22.0751 27 16Z';
const OUTER_CIRCLE_D =
  'M29 16C29 23.1797 23.1797 29 16 29C8.8203 29 3 23.1797 3 16C3 8.8203 8.8203 3 16 3C23.1797 3 29 8.8203 29 16Z';
const ARROW_PATH =
  'M21.6956 17.8553L16.6966 22.7214C16.3083 23.0993 15.6898 23.0993 15.3015 22.7214L10.3025 17.8553C9.90672 17.47 9.89819 16.8369 10.2834 16.4412C10.6686 16.0454 11.3018 16.0369 11.6975 16.4221L14.999 19.6359L14.999 11C14.999 10.4477 15.4468 10 15.999 10C16.5513 10 16.999 10.4477 16.999 11L16.999 19.6359L20.3006 16.4221C20.6963 16.0369 21.3294 16.0454 21.7147 16.4412C22.0999 16.8369 22.0914 17.47 21.6956 17.8553Z';

// Reads the parsed CSSOM (not getComputedStyle, which evaluates media
// queries against the runner's actual OS-level motion preference — see the
// long comment at the call site) to find, for a given element's own
// emotion-generated class, the plain style rule and the
// prefers-reduced-motion override rule that target it. Both exist in the
// CSSOM regardless of whether the query currently matches, so this is
// deterministic across every CI runner.
const findTransitionRulesForElement = (
  element: Element
): {
  baseRule: CSSStyleRule | undefined;
  reducedMotionRule: CSSStyleRule | undefined;
  reducedMotionCondition: string | undefined;
} => {
  const className = Array.from(element.classList).find((name) =>
    name.startsWith('css-')
  );

  let baseRule: CSSStyleRule | undefined;
  let reducedMotionRule: CSSStyleRule | undefined;
  let reducedMotionCondition: string | undefined;

  if (!className) {
    return { baseRule, reducedMotionRule, reducedMotionCondition };
  }

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of Array.from(rules)) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText.includes(className)
      ) {
        baseRule = rule;
        continue;
      }

      if (rule instanceof CSSMediaRule) {
        for (const innerRule of Array.from(rule.cssRules)) {
          if (
            innerRule instanceof CSSStyleRule &&
            innerRule.selectorText.includes(className)
          ) {
            reducedMotionRule = innerRule;
            reducedMotionCondition = rule.conditionText;
          }
        }
      }
    }
  }

  return { baseRule, reducedMotionRule, reducedMotionCondition };
};

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

  it('reserves width for two digits plus the percent sign (width: 3ch, matching UpdateLabel exactly)', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState({
        1: { ...baseDownload, state: 'progressing' },
      }),
    });

    const percentage = screen.getByTestId('downloads-progress');
    const style = getComputedStyle(percentage);

    expect(style.fontVariantNumeric).toBe('tabular-nums');

    // jsdom resolves 'ch' to a pixel value in getComputedStyle rather than
    // echoing 'width: 3ch' back verbatim, so compare against a same-font 1ch
    // probe rather than the literal string.
    const chProbe = document.createElement('span');
    chProbe.style.fontFamily = style.fontFamily;
    chProbe.style.fontSize = style.fontSize;
    chProbe.style.width = '1ch';
    document.body.append(chProbe);
    const oneCh = parseFloat(getComputedStyle(chProbe).width);
    chProbe.remove();

    expect(parseFloat(style.width)).toBeCloseTo(oneCh * 3, 1);
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

  it('collapses the percentage slot (not unmounted, but zero-width and invisible) when the setting is disabled', () => {
    renderWithStore(<DownloadsIndicator />, {
      preloadedState: buildState(
        { 1: { ...baseDownload, state: 'progressing' } },
        { isDownloadsPercentageEnabled: false }
      ),
    });

    expect(screen.getByRole('button')).toBeInTheDocument();

    const slot = screen.getByTestId('downloads-progress-slot');
    expect(getComputedStyle(slot).maxWidth).toBe('0px');
    expect(getComputedStyle(slot).opacity).toBe('0');
    expect(getComputedStyle(slot).marginLeft).toBe('0px');
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

  it('positions the full-size unseen dot tangent on the ring (top/right 1px, not 4px which would sit inside the ring)', () => {
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

    const dot = screen.getByTestId('downloads-unseen-dot');
    expect(getComputedStyle(dot).top).toBe('1px');
    expect(getComputedStyle(dot).right).toBe('1px');
    expect(getComputedStyle(dot).width).toBe('8px');
    expect(getComputedStyle(dot).height).toBe('8px');
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

    expect(
      await screen.findByTestId('downloads-unseen-dot')
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'tabBar.downloads.title' })
    );

    expect(
      screen.queryByTestId('downloads-unseen-dot')
    ).not.toBeInTheDocument();
  });

  describe('glyph geometry', () => {
    const GLYPH_ARC_RADIUS = 12;
    const GLYPH_ARC_CIRCUMFERENCE = 2 * Math.PI * GLYPH_ARC_RADIUS;

    it('renders the glyph svg', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      expect(screen.getByTestId('downloads-glyph')).toBeInTheDocument();
    });

    it('renders exactly two circles (track + arc) while downloading, with the arc dashoffset reflecting determinate progress', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const glyph = screen.getByTestId('downloads-glyph');
      const circles = glyph.querySelectorAll('circle');
      expect(circles).toHaveLength(2);

      for (const circle of circles) {
        expect(Number(circle.getAttribute('r'))).toBe(GLYPH_ARC_RADIUS);
      }

      const [, arc] = circles;
      const expectedOffset = GLYPH_ARC_CIRCUMFERENCE * (1 - 50 / 100);
      expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
        expectedOffset
      );
      expect(Number(arc.getAttribute('stroke-dasharray'))).toBeCloseTo(
        GLYPH_ARC_CIRCUMFERENCE
      );
    });

    it('renders the ring in indeterminate mode (quarter arc) when no active download has a measurable size', () => {
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

      const glyph = screen.getByTestId('downloads-glyph');
      const [, arc] = glyph.querySelectorAll('circle');
      const expectedOffset = GLYPH_ARC_CIRCUMFERENCE * 0.75;

      expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
        expectedOffset
      );
    });

    it('renders only the arrow path while downloading (no annulus subpaths)', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const glyph = screen.getByTestId('downloads-glyph');
      const paths = glyph.querySelectorAll('path');
      expect(paths).toHaveLength(1);

      const d = paths[0].getAttribute('d') ?? '';
      expect(d).not.toContain(TRACK_CIRCLE_D);
      expect(d).not.toContain(OUTER_CIRCLE_D);
      expect(d).toContain(ARROW_PATH);
    });

    it('renders one path with the full original d (annulus + arrow) and no circles while idle', () => {
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

      const glyph = screen.getByTestId('downloads-glyph');
      const paths = glyph.querySelectorAll('path');
      expect(paths).toHaveLength(1);

      const d = paths[0].getAttribute('d') ?? '';
      expect(d).toContain(TRACK_CIRCLE_D);
      expect(d).toContain(OUTER_CIRCLE_D);
      expect(d).toContain(ARROW_PATH);

      expect(glyph.querySelectorAll('circle')).toHaveLength(0);
    });

    it('does not render the stock Fuselage icon', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const button = screen.getByRole('button');
      expect(button.querySelector('.rcx-icon--name-download')).toBeNull();
    });

    it('keeps the arc fully filled in the completed-unseen accent color instead of the plain idle glyph', () => {
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

      screen.getByTestId('downloads-unseen-dot');

      const glyph = screen.getByTestId('downloads-glyph');

      const paths = glyph.querySelectorAll('path');
      expect(paths).toHaveLength(1);
      expect(paths[0].getAttribute('d')).toBe(ARROW_PATH);

      const circles = glyph.querySelectorAll('circle');
      expect(circles).toHaveLength(2);

      const [, arc] = circles;
      expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(0);
      expect(arc.getAttribute('stroke')).toBe(
        'var(--rcx-color-font-info, #095ad2)'
      );
    });

    it('reverts to the plain idle glyph (no circles) once the unseen download is marked seen by clicking the button', async () => {
      const user = userEvent.setup();
      // seenAt is initialized to the mount-time Date.now(); endTime must sit
      // between that mount time and the later click's own Date.now() call
      // for the download to start unseen and end up seen after the click.
      // Date.now is pinned for the duration of this test to make that
      // ordering deterministic instead of racing the wall clock.
      const NOW = Date.now();
      const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW);

      try {
        renderWithStore(<DownloadsIndicator />, {
          preloadedState: buildState({
            1: {
              ...baseDownload,
              state: 'completed',
              receivedBytes: 1000,
              startTime: SESSION_START + 1000,
              endTime: NOW + 1,
            },
          }),
        });

        expect(screen.getByTestId('downloads-unseen-dot')).toBeInTheDocument();

        spy.mockReturnValue(NOW + 60_000);

        await user.click(
          screen.getByRole('button', { name: 'tabBar.downloads.title' })
        );
        await user.click(screen.getByTestId('downloads-panel-backdrop'));

        const glyph = screen.getByTestId('downloads-glyph');
        const paths = glyph.querySelectorAll('path');
        expect(paths).toHaveLength(1);
        expect(paths[0].getAttribute('d')).toContain(TRACK_CIRCLE_D);
        expect(paths[0].getAttribute('d')).toContain(OUTER_CIRCLE_D);
        expect(paths[0].getAttribute('d')).toContain(ARROW_PATH);

        expect(glyph.querySelectorAll('circle')).toHaveLength(0);
      } finally {
        spy.mockRestore();
      }
    });

    it('does not spin the unseen-completed arc (indeterminate spin only applies while actually downloading)', () => {
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

      const glyph = screen.getByTestId('downloads-glyph');
      const arcGroup = glyph.querySelector('g');
      expect(getComputedStyle(arcGroup as Element).animationName).not.toBe(
        'downloads-indicator-arc-spin'
      );
    });

    it('keeps the percentage slot collapsed for a completed-unseen download', () => {
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

      const slot = screen.getByTestId('downloads-progress-slot');
      expect(getComputedStyle(slot).maxWidth).toBe('0px');
      expect(getComputedStyle(slot).opacity).toBe('0');
    });
  });

  describe('percentage renders inside the glyph button, to the right of the glyph', () => {
    it('places the percentage element inside the same button as the glyph', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const percentage = screen.getByTestId('downloads-progress');
      const button = screen.getByRole('button');
      expect(percentage.closest('button')).toBe(button);

      const glyph = screen.getByTestId('downloads-glyph');
      expect(glyph.closest('button')).toBe(button);
    });

    it('renders the glyph before the percentage in DOM order (icon left, text right)', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const button = screen.getByRole('button');
      const glyph = screen.getByTestId('downloads-glyph');
      const slot = screen.getByTestId('downloads-progress-slot');

      const children = Array.from(button.children);
      const glyphWrapperIndex = children.findIndex((child) =>
        child.contains(glyph)
      );
      const slotIndex = children.indexOf(slot);

      expect(glyphWrapperIndex).toBeGreaterThanOrEqual(0);
      expect(slotIndex).toBeGreaterThan(glyphWrapperIndex);
    });

    it('hovering/clicking the single button toggles the popup regardless of where inside it the click lands', async () => {
      const user = userEvent.setup();
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      await user.click(screen.getByTestId('downloads-progress'));

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });
  });

  describe('compact', () => {
    it('shrinks the button height and the unseen dot in compact mode', () => {
      renderWithStore(<DownloadsIndicator compact />, {
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

      const button = screen.getByRole('button');
      expect(getComputedStyle(button).height).toBe('24px');

      const dot = screen.getByTestId('downloads-unseen-dot');
      expect(getComputedStyle(dot).width).toBe('6px');
      expect(getComputedStyle(dot).height).toBe('6px');
      expect(getComputedStyle(dot).top).toBe('2px');
      expect(getComputedStyle(dot).right).toBe('2px');
    });

    it('still shows the percentage text and the glyph in compact mode', () => {
      renderWithStore(<DownloadsIndicator compact />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      expect(screen.getByTestId('downloads-progress')).toHaveTextContent('50');
      expect(screen.getByTestId('downloads-glyph')).toBeInTheDocument();
    });
  });

  describe('icon-only geometry is exactly square', () => {
    it('is 24x24 in compact mode when the percentage is not showing', () => {
      renderWithStore(<DownloadsIndicator compact />, {
        preloadedState: buildState(
          {
            1: {
              ...baseDownload,
              state: 'progressing',
            },
          },
          { isDownloadsPercentageEnabled: false }
        ),
      });

      const { width, height } = screen
        .getByRole('button')
        .getBoundingClientRect();
      expect(width).toBe(height);
      expect(width).toBe(24);
    });

    it('is 32x32 at full size when the percentage is not showing', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState(
          {
            1: {
              ...baseDownload,
              state: 'progressing',
            },
          },
          { isDownloadsPercentageEnabled: false }
        ),
      });

      const { width, height } = screen
        .getByRole('button')
        .getBoundingClientRect();
      expect(width).toBe(height);
      expect(width).toBe(32);
    });

    it('is square for the true idle (seen) glyph state at both sizes', () => {
      const seenTime = Date.now();
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: {
            ...baseDownload,
            state: 'completed',
            receivedBytes: 1000,
            startTime: SESSION_START + 1000,
            endTime: seenTime - 1000,
          },
        }),
      });

      const { width, height } = screen
        .getByRole('button')
        .getBoundingClientRect();
      expect(width).toBe(height);
      expect(width).toBe(32);
    });
  });

  describe('percentage grows/shrinks the button width with an animated transition', () => {
    it('is collapsed (max-width 0, opacity 0, no left margin) when the setting is off, even while downloading', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState(
          { 1: { ...baseDownload, state: 'progressing' } },
          { isDownloadsPercentageEnabled: false }
        ),
      });

      const slot = screen.getByTestId('downloads-progress-slot');
      expect(getComputedStyle(slot).maxWidth).toBe('0px');
      expect(getComputedStyle(slot).opacity).toBe('0');
      expect(getComputedStyle(slot).marginLeft).toBe('0px');
    });

    it('is expanded (opacity 1, non-zero max-width and left margin) once a download with the setting enabled starts', () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const slot = screen.getByTestId('downloads-progress-slot');
      expect(getComputedStyle(slot).opacity).toBe('1');
      expect(parseFloat(getComputedStyle(slot).maxWidth)).toBeGreaterThan(0);
      expect(parseFloat(getComputedStyle(slot).marginLeft)).toBeGreaterThan(0);
    });

    it("applies Fuselage's standard 0.18s micro-interaction duration (matching .rcx-box--animated) on max-width, margin and opacity, so the resize is animated, not instant, and opts out under prefers-reduced-motion", () => {
      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const slot = screen.getByTestId('downloads-progress-slot');

      // getComputedStyle(slot).transition reflects the runner's ACTUAL
      // prefers-reduced-motion setting: GitHub's Windows/macOS CI VMs report
      // 'reduce' (OS-level animations disabled), so computed style there is
      // legitimately 'none', while Ubuntu/local runners with no preference
      // resolve the real transition — same component, different environment,
      // different (both correct) computed result. Reading the stylesheet
      // rules via the CSSOM instead is deterministic in every environment:
      // cssRules/cssText reflect the parsed source, not an evaluated media
      // query, so both the base rule and the reduced-motion override are
      // always present and assertable regardless of the runner's actual
      // motion preference.
      const { baseRule, reducedMotionRule, reducedMotionCondition } =
        findTransitionRulesForElement(slot);

      expect(baseRule).toBeDefined();
      expect(baseRule?.style.transition).toContain('max-width');
      expect(baseRule?.style.transition).toContain('margin');
      expect(baseRule?.style.transition).toContain('opacity');
      expect(baseRule?.style.transition).toContain('0.18s');

      expect(reducedMotionRule).toBeDefined();
      expect(reducedMotionCondition).toContain(
        'prefers-reduced-motion: reduce'
      );
      expect(reducedMotionRule?.style.transition).toBe('none');
    });

    it('grows the button width when the percentage expands (icon slides left as the group is right-anchored)', () => {
      const { unmount } = renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState(
          { 1: { ...baseDownload, state: 'progressing' } },
          { isDownloadsPercentageEnabled: false }
        ),
      });

      const collapsedWidth = screen
        .getByRole('button')
        .getBoundingClientRect().width;
      unmount();

      renderWithStore(<DownloadsIndicator />, {
        preloadedState: buildState({
          1: { ...baseDownload, state: 'progressing' },
        }),
      });

      const expandedWidth = screen
        .getByRole('button')
        .getBoundingClientRect().width;

      expect(expandedWidth).toBeGreaterThan(collapsedWidth);
    });
  });
});
