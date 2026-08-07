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
  gap: 4px;
`;

// Fuselage's `medium` IconButton renders a 32px (x32) square with a 24px
// (x24) icon glyph; the ring circumscribes the glyph with a couple px of
// breathing room inside the button's box.
const RING_SIZE = 28;
const RING_RADIUS = 12;
const RING_STROKE_WIDTH = 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// The stock Fuselage `download` icon (node_modules/@rocket.chat/icons/dist/svg/download.svg,
// viewBox 32) draws its own circle as an annulus between r=11 and r=13 around
// (16,16) — a mid-radius-12, stroke-2 ring in 32-space. The medium IconButton
// renders that glyph at 24px (scale 0.75) centered in the 32px button, so in
// overlay terms (centered on the button, same as ProgressRing) that annulus
// becomes radius 9, stroke-width 1.5. Drawing our accent arc exactly on top of
// it makes the icon's own circle double as the arc's track.
const ICON_RING_SIZE = 24;
const ICON_RING_RADIUS = 9;
const ICON_RING_STROKE_WIDTH = 1.5;
const ICON_RING_CIRCUMFERENCE = 2 * Math.PI * ICON_RING_RADIUS;

const ButtonWithRing = styled.div`
  position: relative;
  display: flex;
`;

const ProgressRing = styled.svg<{ indeterminate: boolean; size: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  margin-top: ${({ size }) => -size / 2}px;
  margin-left: ${({ size }) => -size / 2}px;
  pointer-events: none;
  transform: ${({ indeterminate }) =>
    indeterminate ? 'none' : 'rotate(-90deg)'};
  animation: ${({ indeterminate }) =>
    indeterminate ? 'downloads-progress-ring-spin 1s linear infinite' : 'none'};

  @keyframes downloads-progress-ring-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  circle {
    transition: stroke-dashoffset 200ms ease-out;
  }
`;

const Percentage = styled.span`
  font-family: var(
    --rcx-font-family-mono,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace
  );
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  min-width: 2.5ch;
  text-align: right;
  flex: 0 0 auto;
  color: var(--rcx-color-font-titles-labels, #f2f3f5);
`;

const UnseenDot = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--rcx-color-status-background-success, #2de0a5);
  pointer-events: none;
`;

const ARROW_PATH = 'M19 9h-4V3H9v6H5l7 7 7-7z';
const TRAY_PATH = 'M5 20h14v-2H5v2z';

const ChromeGlyphButton = styled.button`
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* Same color resolution chain Fuselage applies to .rcx-button--icon, so
     the glyph always matches the sibling IconButton variant's arrow. */
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
`;

// The redraw glyph's own arc/track split already communicates progress, so
// TabBarButtonWrapper's `& button { opacity: 0.6 }` idle dimming (specificity
// 0-1-1: one class + one type selector) needs to be overridden while
// downloading. `&&[data-downloads-status='downloading']` compiles to the
// component class doubled plus an attribute selector (0-3-0), which beats it —
// verified by inspecting the emitted rule order/specificity in a rendered
// test. Idle keeps the normal 0.6 dimming like every other tab bar button.
const RedrawGlyphButton = styled(ChromeGlyphButton)`
  &&[data-downloads-status='downloading'] {
    opacity: 1;
  }
`;

const REDRAW_TRACK_CIRCLE_D =
  'M27 16C27 9.92487 22.0751 5 16 5C9.92487 5 5 9.92487 5 16C5 22.0751 9.92487 27 16 27C22.0751 27 27 22.0751 27 16Z';
const REDRAW_OUTER_CIRCLE_D =
  'M29 16C29 23.1797 23.1797 29 16 29C8.8203 29 3 23.1797 3 16C3 8.8203 8.8203 3 16 3C23.1797 3 29 8.8203 29 16Z';
const REDRAW_ARROW_PATH =
  'M21.6956 17.8553L16.6966 22.7214C16.3083 23.0993 15.6898 23.0993 15.3015 22.7214L10.3025 17.8553C9.90672 17.47 9.89819 16.8369 10.2834 16.4412C10.6686 16.0454 11.3018 16.0369 11.6975 16.4221L14.999 19.6359L14.999 11C14.999 10.4477 15.4468 10 15.999 10C16.5513 10 16.999 10.4477 16.999 11L16.999 19.6359L20.3006 16.4221C20.6963 16.0369 21.3294 16.0454 21.7147 16.4412C22.0999 16.8369 22.0914 17.47 21.6956 17.8553Z';
const REDRAW_FULL_PATH_D = `${REDRAW_TRACK_CIRCLE_D} ${REDRAW_OUTER_CIRCLE_D} ${REDRAW_ARROW_PATH}`;

const REDRAW_RING_RADIUS = 12;
const REDRAW_RING_STROKE_WIDTH = 2;
const REDRAW_RING_CIRCUMFERENCE = 2 * Math.PI * REDRAW_RING_RADIUS;

/* No unconditional transform-origin here: the SVG 'transform' attribute maps
   to the CSS transform property, so a CSS transform-origin stacks onto the
   origin already baked into rotate(-90 16 16) and displaces the arc out of
   the viewBox. fill-box + center self-centers the spin without conflicting —
   same pattern (and same bug) as the earlier chrome-variant ring group. */
const RedrawArcGroup = styled.g<{ spin: boolean }>`
  ${({ spin }) =>
    spin
      ? `
    transform-box: fill-box;
    transform-origin: center;
    animation: downloads-redraw-arc-spin 1s linear infinite;
  `
      : ''}

  circle {
    transition: stroke-dashoffset 200ms ease-out;
  }

  @keyframes downloads-redraw-arc-spin {
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
  variant?: 'ring' | 'chrome' | 'fuselage' | 'redraw';
};

export const DownloadsIndicator = ({
  variant = 'ring',
}: DownloadsIndicatorProps = {}) => {
  const { t, i18n } = useTranslation();

  const downloads = useSelector(({ downloads }: RootState) => downloads);
  const isDownloadsPercentageEnabled = useSelector(
    ({ isDownloadsPercentageEnabled }: RootState) =>
      isDownloadsPercentageEnabled
  );

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

  return (
    <>
      <DownloadsButtonWrapper>
        {/* Percentage sits left of the icon: the group is right-anchored in
            the strip, so text there grows leftward without moving the icon. */}
        {isDownloading && isDownloadsPercentageEnabled && (
          <Percentage data-testid='downloads-progress'>
            {t('tabBar.downloads.percent', { percent: progress })}
          </Percentage>
        )}
        <ButtonWithRing>
          {variant === 'chrome' && (
            <ChromeGlyphButton
              ref={reference}
              type='button'
              title={label}
              aria-label={label}
              aria-haspopup='dialog'
              aria-expanded={isOpen}
              data-downloads-status={isDownloading ? 'downloading' : 'idle'}
              onClick={handleToggle}
            >
              <svg
                viewBox='0 0 24 24'
                width={24}
                height={24}
                data-testid='downloads-chrome-glyph'
              >
                {isDownloading ? (
                  <g transform='translate(0 2.5)'>
                    <path d={ARROW_PATH} fill='currentColor' />
                  </g>
                ) : (
                  <>
                    <path d={ARROW_PATH} fill='currentColor' />
                    <path d={TRAY_PATH} fill='currentColor' />
                  </>
                )}
              </svg>
            </ChromeGlyphButton>
          )}
          {variant === 'redraw' && (
            <RedrawGlyphButton
              ref={reference}
              type='button'
              title={label}
              aria-label={label}
              aria-haspopup='dialog'
              aria-expanded={isOpen}
              data-downloads-status={isDownloading ? 'downloading' : 'idle'}
              onClick={handleToggle}
            >
              <svg
                viewBox='0 0 32 32'
                width={24}
                height={24}
                fill='currentColor'
                data-testid='downloads-redraw-glyph'
              >
                {isDownloading ? (
                  <>
                    <circle
                      cx={16}
                      cy={16}
                      r={REDRAW_RING_RADIUS}
                      fill='none'
                      strokeWidth={REDRAW_RING_STROKE_WIDTH}
                      stroke='currentColor'
                      strokeOpacity={0.2}
                    />
                    <RedrawArcGroup spin={isIndeterminate}>
                      <circle
                        cx={16}
                        cy={16}
                        r={REDRAW_RING_RADIUS}
                        fill='none'
                        strokeWidth={REDRAW_RING_STROKE_WIDTH}
                        strokeLinecap='round'
                        stroke='var(--rcx-color-font-info, #095ad2)'
                        strokeDasharray={REDRAW_RING_CIRCUMFERENCE}
                        strokeDashoffset={
                          isIndeterminate
                            ? REDRAW_RING_CIRCUMFERENCE * 0.75
                            : REDRAW_RING_CIRCUMFERENCE * (1 - progress / 100)
                        }
                        transform='rotate(-90 16 16)'
                      />
                    </RedrawArcGroup>
                    <path d={REDRAW_ARROW_PATH} fill='currentColor' />
                  </>
                ) : (
                  <path d={REDRAW_FULL_PATH_D} fill='currentColor' />
                )}
              </svg>
            </RedrawGlyphButton>
          )}
          {variant !== 'chrome' && variant !== 'redraw' && (
            <IconButton
              ref={reference}
              icon='download'
              medium
              title={label}
              aria-label={label}
              aria-haspopup='dialog'
              aria-expanded={isOpen}
              data-downloads-status={isDownloading ? 'downloading' : 'idle'}
              onClick={handleToggle}
            />
          )}
          {isDownloading && variant === 'fuselage' && (
            <ProgressRing
              viewBox={`0 0 ${ICON_RING_SIZE} ${ICON_RING_SIZE}`}
              size={ICON_RING_SIZE}
              indeterminate={isIndeterminate}
              data-testid='downloads-progress-ring'
              aria-hidden='true'
            >
              <circle
                cx={ICON_RING_SIZE / 2}
                cy={ICON_RING_SIZE / 2}
                r={ICON_RING_RADIUS}
                fill='none'
                strokeWidth={ICON_RING_STROKE_WIDTH}
                strokeLinecap='round'
                stroke='var(--rcx-color-font-info, #095ad2)'
                strokeDasharray={ICON_RING_CIRCUMFERENCE}
                strokeDashoffset={
                  isIndeterminate
                    ? ICON_RING_CIRCUMFERENCE * 0.75
                    : ICON_RING_CIRCUMFERENCE * (1 - progress / 100)
                }
              />
            </ProgressRing>
          )}
          {isDownloading && variant !== 'fuselage' && variant !== 'redraw' && (
            <ProgressRing
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              size={RING_SIZE}
              indeterminate={isIndeterminate}
              data-testid='downloads-progress-ring'
              aria-hidden='true'
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill='none'
                strokeWidth={RING_STROKE_WIDTH}
                stroke='currentColor'
                strokeOpacity={0.2}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill='none'
                strokeWidth={RING_STROKE_WIDTH}
                strokeLinecap='round'
                stroke='var(--rcx-color-font-info, #095ad2)'
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={
                  isIndeterminate
                    ? RING_CIRCUMFERENCE * 0.75
                    : RING_CIRCUMFERENCE * (1 - progress / 100)
                }
              />
            </ProgressRing>
          )}
          {!isOpen && hasUnseenCompleted && (
            <UnseenDot data-testid='downloads-unseen-dot' />
          )}
        </ButtonWithRing>
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
