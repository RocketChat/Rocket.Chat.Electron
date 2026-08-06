import styled from '@emotion/styled';
import { Box, Dropdown, Icon, IconButton } from '@rocket.chat/fuselage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { Download } from '../../../downloads/common';
import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import { SIDE_BAR_DOWNLOADS_BUTTON_CLICKED } from '../../actions';
import { DownloadsIndicatorItem } from './DownloadsIndicatorItem';

// Captured once at module load, this marks the boundary between downloads
// from earlier sessions (ignored, like Chrome's downloads button) and
// downloads that happened in the current session (shown even after they
// finish, until the app restarts).
const SESSION_START = Date.now();

const MAX_RECENT_DOWNLOADS = 5;

const Pill = styled.button<{ progress: number }>`
  appearance: none;
  box-sizing: border-box;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 11px;
  cursor: pointer;
  color: var(--rcx-color-button-font-on-primary, #ffffff);
  -webkit-app-region: no-drag;

  /* Matches UpdateLabel: lifts the pill above the fixed WindowDragBar so the
     whole pill stays clickable instead of just the part poking out below it. */
  position: relative;
  z-index: 1;

  background-color: var(
    --rcx-color-button-background-secondary-default,
    #4d5259
  );
  background-image: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.32) 0%,
    rgba(255, 255, 255, 0.32) ${({ progress }) => progress}%,
    transparent ${({ progress }) => progress}%,
    transparent 100%
  );
  transition: background-image 150ms ease-out;

  &:hover:not(:disabled) {
    background-color: var(
      --rcx-color-button-background-secondary-hover,
      #40444a
    );
  }

  &:active:not(:disabled) {
    background-color: var(
      --rcx-color-button-background-secondary-press,
      #40444a
    );
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--rcx-color-stroke-extra-light-highlight, #d1ebfe);
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10;
  -webkit-app-region: no-drag;
`;

const PanelLayer = styled.div`
  position: relative;
  z-index: 11;
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
  font-variant-numeric: tabular-nums;
  min-width: 2.5ch;
  text-align: right;
  flex: 0 0 auto;
`;

const isActive = (download: Download): boolean =>
  download.state === 'progressing' || download.state === 'paused';

export const DownloadsIndicator = () => {
  const { t, i18n } = useTranslation();

  const downloads = useSelector(({ downloads }: RootState) => downloads);

  const reference = useRef<HTMLButtonElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(0);

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
    if (activeDownloads.length === 0) {
      return 0;
    }

    const totalBytes = activeDownloads.reduce(
      (sum, download) => sum + download.totalBytes,
      0
    );

    if (totalBytes === 0) {
      return 0;
    }

    const receivedBytes = activeDownloads.reduce(
      (sum, download) => sum + download.receivedBytes,
      0
    );

    return Math.min(
      100,
      Math.max(0, Math.floor((receivedBytes / totalBytes) * 100))
    );
  }, [activeDownloads]);

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

  return (
    <>
      <Pill
        ref={reference}
        type='button'
        progress={isDownloading ? progress : 0}
        title={label}
        aria-label={label}
        aria-haspopup='dialog'
        aria-expanded={isOpen}
        data-downloads-status={isDownloading ? 'downloading' : 'idle'}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Icon name='download' size='x16' />
        {isDownloading && (
          <>
            {activeDownloads.length > 1 && (
              <span>{activeDownloads.length}</span>
            )}
            <Percentage data-testid='downloads-progress'>
              {t('tabBar.downloads.percent', { percent: progress })}
            </Percentage>
          </>
        )}
      </Pill>
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
