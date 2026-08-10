import styled from '@emotion/styled';
import { Box, Dropdown, IconButton } from '@rocket.chat/fuselage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { Download } from '../../../downloads/common';
import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import { SIDE_BAR_DOWNLOADS_BUTTON_CLICKED } from '../../actions';
import { TabBarButtonWrapper } from '../TabBar/styles';
import { DownloadsIndicatorItem } from './DownloadsIndicatorItem';

// Captured once at module load, this marks the boundary between downloads
// from earlier sessions (ignored, like Chrome's downloads button) and
// downloads that happened in the current session (shown even after they
// finish, until the app restarts).
const SESSION_START = Date.now();

const MAX_RECENT_DOWNLOADS = 5;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10;
  -webkit-app-region: no-drag;
`;

const PanelLayer = styled.div`
  /* Out of the flex flow: as an in-flow sibling inside the tab bar Strip
     (gap: 3px) it would add a gap on mount and shift the button left. */
  position: fixed;
  z-index: 11;
`;

const DownloadsButtonWrapper = styled(TabBarButtonWrapper)`
  position: relative;
  display: flex;
  align-items: center;
`;

// The glyph draws its own arc/track split (see GLYPH_ARC_RADIUS below), a
// mid-radius-12, stroke-2 ring in the glyph's native 32-viewBox space
// centered on (16,16).
const GLYPH_ARC_RADIUS = 12;
const GLYPH_ARC_STROKE_WIDTH = 2;
const GLYPH_ARC_CIRCUMFERENCE = 2 * Math.PI * GLYPH_ARC_RADIUS;

// Compact mode targets the TopBar strip (28px tall on macOS, 32px on
// Windows — src/ui/components/TopBar/index.tsx). Fuselage's `small` square
// button is 28px (1.75rem, rcx-button--small-square in fuselage.css) — zero
// clearance on macOS, so any dot overhang still clips. `tiny` is 24px
// (1.5rem, rcx-button--tiny-square), leaving 4px on macOS / 8px on Windows —
// the smallest size that actually fits with margin, so it's the one used
// here. The rendered glyph box scales by 24/32 = 0.75 off the full-size
// button; the arc itself keeps viewBox 32, so only the rendered width/height
// shrinks — the arc geometry above stays the same in both sizes.
const COMPACT_BUTTON_SIZE = 24;
const GLYPH_SIZE = 24;
const COMPACT_GLYPH_SIZE = 24; // 32 (viewBox) * 0.75, viewBox stays 32

const COMPACT_UNSEEN_DOT_SIZE = 6;
const COMPACT_PERCENTAGE_FONT_SIZE = '0.6875rem';

// The dot anchors to the GLYPH's own box, not the button's — the button also
// contains the percentage text (to its left), and the button grows leftward
// as digits are added, which would otherwise drag the dot's anchor with it.
const GlyphWrapper = styled.span`
  position: relative;
  display: flex;
`;

// Both sizes render the glyph svg at 24px, so the ring's outer edge sits
// ~9.75px from the glyph center in both cases. A dot centered at (19, 5) is
// ~9.9px from center — tangent on the ring, sitting on top of it rather than
// inside it. Compact's 6px dot at top/right 2px already lands there; the
// full-size 8px dot needs top/right 1px (not 4px, which centers it at (16, 8)
// — only ~5.7px from center, overlapping the ring's stroke) to land at the
// same (19, 5) tangent point.
const UnseenDot = styled.span<{ compact: boolean }>`
  position: absolute;
  top: ${({ compact }) => (compact ? '2px' : '1px')};
  right: ${({ compact }) => (compact ? '2px' : '1px')};
  width: ${({ compact }) => (compact ? COMPACT_UNSEEN_DOT_SIZE : 8)}px;
  height: ${({ compact }) => (compact ? COMPACT_UNSEEN_DOT_SIZE : 8)}px;
  border-radius: 50%;
  /* Same token as the progress arc, so the dot and the downloading circle
     always share one blue in every theme. */
  background-color: var(--rcx-color-font-info, #095ad2);
  pointer-events: none;
`;

const TRACK_CIRCLE_D =
  'M27 16C27 9.92487 22.0751 5 16 5C9.92487 5 5 9.92487 5 16C5 22.0751 9.92487 27 16 27C22.0751 27 27 22.0751 27 16Z';
const OUTER_CIRCLE_D =
  'M29 16C29 23.1797 23.1797 29 16 29C8.8203 29 3 23.1797 3 16C3 8.8203 8.8203 3 16 3C23.1797 3 29 8.8203 29 16Z';
const ARROW_PATH =
  'M21.6956 17.8553L16.6966 22.7214C16.3083 23.0993 15.6898 23.0993 15.3015 22.7214L10.3025 17.8553C9.90672 17.47 9.89819 16.8369 10.2834 16.4412C10.6686 16.0454 11.3018 16.0369 11.6975 16.4221L14.999 19.6359L14.999 11C14.999 10.4477 15.4468 10 15.999 10C16.5513 10 16.999 10.4477 16.999 11L16.999 19.6359L20.3006 16.4221C20.6963 16.0369 21.3294 16.0454 21.7147 16.4412C22.0999 16.8369 22.0914 17.47 21.6956 17.8553Z';
const FULL_GLYPH_PATH_D = `${TRACK_CIRCLE_D} ${OUTER_CIRCLE_D} ${ARROW_PATH}`;

// Same core technique UpdateLabel's Percentage uses (src/ui/components/TopBar/UpdateLabel.tsx):
// monospace font + tabular-nums + a fixed width sized for two digits plus the
// '%' sign, so the digits never jitter the reserved space as the percent
// climbs from 1 digit to 2. UpdateLabel uses min-width since its text is the
// last element in the pill; here the width is a fixed 'width' (not
// min-width) because PercentageSlot animates its OWN box (max-width) around
// this fixed-width child, and text-align is left (not right) since the
// percentage now sits to the right of the glyph, not the left.
const PERCENTAGE_RESERVED_WIDTH = '3ch';
const PERCENTAGE_GAP = 4;

const Percentage = styled.span<{ compact: boolean }>`
  font-family: var(
    --rcx-font-family-mono,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace
  );
  font-size: ${({ compact }) =>
    compact ? COMPACT_PERCENTAGE_FONT_SIZE : '0.75rem'};
  font-variant-numeric: tabular-nums;
  width: ${PERCENTAGE_RESERVED_WIDTH};
  text-align: left;
  flex: 0 0 auto;
  color: inherit;
`;

// Always mounted (even when there's nothing to show) so hiding/showing the
// percentage animates instead of snapping the button's width — max-width
// (0 <-> the reserved 3ch) transitions together with opacity, and the left
// margin (0 <-> PERCENTAGE_GAP) collapses the gap to the glyph in the same
// transition instead of leaving a phantom gap when the text is hidden. Both
// properties share the timing so the whole collapse/expand reads as one
// smooth resize rather than a snap plus a slide.
//
// 0.18s is Fuselage's own micro-interaction duration, not an invented value:
// node_modules/@rocket.chat/fuselage/dist/fuselage.css's `.rcx-box--animated`
// rule is `transition: all .18s`, with a `@media (prefers-reduced-motion: reduce)`
// override to `transition: none` — both mirrored here. The transition is
// declared unconditionally (default-on) and only removed under the
// `reduce` media query (opt-out) — a bare `(prefers-reduced-motion)` with no
// value is a boolean media-feature check that's true whenever the browser
// merely supports the feature (which headless Chromium in CI does), so it
// would always match and permanently disable the transition.
const PercentageSlot = styled.span<{ expanded: boolean; compact: boolean }>`
  display: inline-flex;
  overflow: hidden;
  white-space: nowrap;
  max-width: ${({ expanded }) =>
    expanded ? PERCENTAGE_RESERVED_WIDTH : '0px'};
  margin-left: ${({ expanded }) => (expanded ? PERCENTAGE_GAP : 0)}px;
  /* Compact drops the button's horizontal padding (square icon-only), so
     the expanded text needs its own trailing breathing room; full size
     already gets it from the button's 4px padding. Animated with the rest
     so it collapses to nothing. */
  margin-right: ${({ expanded, compact }) =>
    expanded && compact ? PERCENTAGE_GAP : 0}px;
  opacity: ${({ expanded }) => (expanded ? 1 : 0)};
  transition:
    max-width 0.18s ease,
    margin 0.18s ease,
    opacity 0.18s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Percentage text and glyph render as ONE control (same button), so their
// shared hover/click surface covers both — TabBarButtonWrapper's `& button`
// hover background then paints across text+glyph together. Icon-only, the
// button must land exactly square: compact is a 24px glyph in a 24px button
// (0 horizontal padding), full-size is a 24px glyph in a 32px button (4px
// padding each side, 24 + 8 = 32) — so padding is compact-aware rather than
// a constant. Horizontal breathing room for the expanded percentage comes
// from PercentageSlot's own margin, not from extra button padding.
const GlyphButton = styled.button<{ compact: boolean }>`
  width: auto;
  height: ${({ compact }) => (compact ? COMPACT_BUTTON_SIZE : 32)}px;
  background: transparent;
  border: none;
  padding: ${({ compact }) => (compact ? '0' : '0 4px')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* Same color resolution chain Fuselage applies to .rcx-button--icon, so
     the glyph always matches the rest of the tab bar's icon buttons. */
  color: var(
    --rcx-color-button-icon-color,
    var(
      --rcx-button-secondary-color,
      var(
        --rcx-color-button-font-on-secondary,
        var(--rcx-color-neutral-900, #1f2329)
      )
    )
  );

  /* The glyph's own arc/track split already communicates progress, so
     TabBarButtonWrapper's ampersand-button opacity:0.6 idle dimming rule
     (specificity 0-1-1: one class + one type selector) needs to be
     overridden while downloading. The doubled-ampersand attribute selector
     below compiles to the component class doubled plus an attribute
     selector (0-3-0), which beats it — verified by inspecting the emitted
     rule order/specificity in a rendered test. Idle keeps the normal 0.6
     dimming like every other tab bar button.

     'unseen' (download finished, popup not opened yet) also stays at full
     brightness, like Chrome, until the user clicks the button. */
  &&[data-downloads-status='downloading'],
  &&[data-downloads-status='unseen'] {
    opacity: 1;
  }
`;

/* No unconditional transform-origin here: the SVG 'transform' attribute maps
   to the CSS transform property, so a CSS transform-origin stacks onto the
   origin already baked into rotate(-90 16 16) and displaces the arc out of
   the viewBox. fill-box + center self-centers the spin without conflicting. */
const ArcGroup = styled.g<{ spin: boolean }>`
  ${({ spin }) =>
    spin
      ? `
    transform-box: fill-box;
    transform-origin: center;
    animation: downloads-indicator-arc-spin 1s linear infinite;
  `
      : ''}

  circle {
    transition: stroke-dashoffset 200ms ease-out;
  }

  @keyframes downloads-indicator-arc-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const isActive = (download: Download): boolean =>
  download.state === 'progressing' || download.state === 'paused';

type DownloadsIndicatorProps = {
  compact?: boolean;
};

export const DownloadsIndicator = ({
  compact = false,
}: DownloadsIndicatorProps = {}) => {
  const { t, i18n } = useTranslation();

  const downloads = useSelector(({ downloads }: RootState) => downloads);
  const isDownloadsPercentageEnabled = useSelector(
    ({ isDownloadsPercentageEnabled }: RootState) =>
      isDownloadsPercentageEnabled
  );

  const glyphSize = compact ? COMPACT_GLYPH_SIZE : GLYPH_SIZE;

  const reference = useRef<HTMLButtonElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(0);
  const [seenAt, setSeenAt] = useState(() => Date.now());

  const placement =
    process.platform === 'win32' ? 'bottom-start' : 'bottom-end';

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const allDownloads = useMemo(() => Object.values(downloads), [downloads]);

  const activeDownloads = useMemo(
    () => allDownloads.filter(isActive),
    [allDownloads]
  );

  const recentDownloads = useMemo(
    () =>
      allDownloads
        .filter(
          (download) =>
            isActive(download) ||
            (download.startTime >= SESSION_START &&
              download.startTime > dismissedAt)
        )
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, MAX_RECENT_DOWNLOADS),
    [allDownloads, dismissedAt]
  );

  const progress = useMemo(() => {
    const ratios = activeDownloads
      .filter((download) => download.totalBytes > 0)
      .map((download) => download.receivedBytes / download.totalBytes);

    if (ratios.length === 0) {
      return 0;
    }

    const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;

    return Math.min(100, Math.max(0, Math.floor(mean * 100)));
  }, [activeDownloads]);

  const isIndeterminate = useMemo(
    () =>
      activeDownloads.length > 0 &&
      activeDownloads.every((download) => download.totalBytes <= 0),
    [activeDownloads]
  );

  const hasUnseenCompleted = useMemo(
    () =>
      allDownloads.some(
        (download) =>
          download.state === 'completed' && (download.endTime ?? 0) > seenAt
      ),
    [allDownloads, seenAt]
  );

  const isVisible =
    activeDownloads.length > 0 ||
    allDownloads.some(
      (download) =>
        download.startTime >= SESSION_START && download.startTime > dismissedAt
    );

  if (!isVisible) {
    return null;
  }

  const isDownloading = activeDownloads.length > 0;

  const label = isDownloading
    ? t('tabBar.downloads.tooltip')
    : t('tabBar.downloads.title');

  const handleShowAll = (): void => {
    setIsOpen(false);
    dispatch({ type: SIDE_BAR_DOWNLOADS_BUTTON_CLICKED });
  };

  const handleDismiss = (): void => {
    setIsOpen(false);
    setDismissedAt(Date.now());
  };

  const handleToggle = (): void => {
    setIsOpen((current) => {
      const next = !current;
      if (next) {
        setSeenAt(Date.now());
      }
      return next;
    });
  };

  // Fully covers the track once downloading is done — the arc stays the
  // completed accent blue for the 'unseen' state instead of snapping back
  // to the plain currentColor glyph, until the user marks it seen.
  const getArcDashoffset = (): number => {
    if (!isDownloading) {
      return 0;
    }

    if (isIndeterminate) {
      return GLYPH_ARC_CIRCUMFERENCE * 0.75;
    }

    return GLYPH_ARC_CIRCUMFERENCE * (1 - progress / 100);
  };

  return (
    <>
      <DownloadsButtonWrapper>
        <GlyphButton
          ref={reference}
          compact={compact}
          type='button'
          title={label}
          aria-label={label}
          aria-haspopup='dialog'
          aria-expanded={isOpen}
          data-downloads-status={
            (isDownloading && 'downloading') ||
            (hasUnseenCompleted && 'unseen') ||
            'idle'
          }
          onClick={handleToggle}
        >
          <GlyphWrapper>
            <svg
              viewBox='0 0 32 32'
              width={glyphSize}
              height={glyphSize}
              fill='currentColor'
              data-testid='downloads-glyph'
            >
              {isDownloading || hasUnseenCompleted ? (
                <>
                  <circle
                    cx={16}
                    cy={16}
                    r={GLYPH_ARC_RADIUS}
                    fill='none'
                    strokeWidth={GLYPH_ARC_STROKE_WIDTH}
                    stroke='currentColor'
                    strokeOpacity={0.2}
                  />
                  <ArcGroup spin={isDownloading && isIndeterminate}>
                    <circle
                      cx={16}
                      cy={16}
                      r={GLYPH_ARC_RADIUS}
                      fill='none'
                      strokeWidth={GLYPH_ARC_STROKE_WIDTH}
                      strokeLinecap='round'
                      stroke='var(--rcx-color-font-info, #095ad2)'
                      strokeDasharray={GLYPH_ARC_CIRCUMFERENCE}
                      strokeDashoffset={getArcDashoffset()}
                      transform='rotate(-90 16 16)'
                    />
                  </ArcGroup>
                  <path d={ARROW_PATH} fill='currentColor' />
                </>
              ) : (
                <path d={FULL_GLYPH_PATH_D} fill='currentColor' />
              )}
            </svg>
            {!isOpen && hasUnseenCompleted && (
              <UnseenDot compact={compact} data-testid='downloads-unseen-dot' />
            )}
          </GlyphWrapper>
          <PercentageSlot
            expanded={isDownloading && isDownloadsPercentageEnabled}
            compact={compact}
            data-testid='downloads-progress-slot'
          >
            <Percentage compact={compact} data-testid='downloads-progress'>
              {t('tabBar.downloads.percent', { percent: progress })}
            </Percentage>
          </PercentageSlot>
        </GlyphButton>
      </DownloadsButtonWrapper>
      {isOpen && (
        <>
          <Backdrop
            data-testid='downloads-panel-backdrop'
            onMouseDown={() => setIsOpen(false)}
          />
          <PanelLayer>
            <Dropdown reference={reference} ref={target} placement={placement}>
              <Box
                role='dialog'
                aria-label={t('tabBar.downloads.title')}
                display='flex'
                flexDirection='column'
                paddingInline='x12'
                paddingBlock='x12'
                width='x320'
                style={{ WebkitAppRegion: 'no-drag' } as never}
              >
                <Box
                  display='flex'
                  alignItems='center'
                  justifyContent='space-between'
                  marginBlockEnd='x8'
                >
                  <Box fontScale='h4'>{t('tabBar.downloads.title')}</Box>
                  <IconButton
                    icon='cross'
                    small
                    title={t('tabBar.downloads.dismiss')}
                    aria-label={t('tabBar.downloads.dismiss')}
                    onClick={handleDismiss}
                  />
                </Box>
                <Box display='flex' flexDirection='column'>
                  {recentDownloads.map((download) => (
                    <DownloadsIndicatorItem
                      key={download.itemId}
                      download={download}
                      t={t}
                      i18n={i18n}
                    />
                  ))}
                </Box>
                <Box
                  is='button'
                  type='button'
                  marginBlockStart='x8'
                  paddingBlock='x8'
                  fontScale='p2'
                  color='info'
                  textAlign='center'
                  borderBlockStartWidth='x1'
                  borderBlockStartStyle='solid'
                  borderBlockStartColor='extra-light'
                  style={{
                    cursor: 'pointer',
                    background: 'none',
                  }}
                  onClick={handleShowAll}
                >
                  {t('tabBar.downloads.showAll')}
                </Box>
              </Box>
            </Dropdown>
          </PanelLayer>
        </>
      )}
    </>
  );
};

export default DownloadsIndicator;
