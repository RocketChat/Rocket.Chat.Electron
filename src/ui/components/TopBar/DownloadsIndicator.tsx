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

const ButtonWithRing = styled.div`
  position: relative;
  display: flex;
`;

const ProgressRing = styled.svg<{ indeterminate: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${RING_SIZE}px;
  height: ${RING_SIZE}px;
  margin-top: -${RING_SIZE / 2}px;
  margin-left: -${RING_SIZE / 2}px;
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

const isActive = (download: Download): boolean =>
  download.state === 'progressing' || download.state === 'paused';

export const DownloadsIndicator = () => {
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
        <ButtonWithRing>
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
          {isDownloading && (
            <ProgressRing
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
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
        </ButtonWithRing>
        {isDownloading && isDownloadsPercentageEnabled && (
          <Percentage data-testid='downloads-progress'>
            {t('tabBar.downloads.percent', { percent: progress })}
          </Percentage>
        )}
        {!isOpen && hasUnseenCompleted && (
          <UnseenDot data-testid='downloads-unseen-dot' />
        )}
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
