import styled from '@emotion/styled';
import {
  Box,
  Button,
  ButtonGroup,
  Chevron,
  Dropdown,
} from '@rocket.chat/fuselage';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import {
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_SKIP_REQUESTED,
} from '../../../updates/actions';
import { useDropdownVisibility } from '../SideBar/useDropdownVisibility';

/**
 * Blue pill in the window chrome announcing an available update.
 *
 * Clicking it opens a panel with the version change plus the install and skip
 * actions. Once the download starts the pill turns into a live percentage, and
 * when it completes it becomes the button that restarts into the new version.
 * `progress` paints a brighter fill across the pill so the percentage reads as a
 * progress bar rather than plain text.
 */
const Label = styled.button<{ progress: number }>`
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
  padding: 0 10px;
  border-radius: 11px;
  cursor: pointer;
  color: var(--rcx-color-button-font-on-primary, #ffffff);
  -webkit-app-region: no-drag;

  /* The shell overlays a fixed 22px WindowDragBar across the top of the window,
     which is taller than the title bar itself. Being positioned lifts the pill
     above it so the whole pill stays clickable instead of just the few pixels
     poking out below the drag region. */
  position: relative;
  z-index: 1;

  /* The fill is a hard-stop gradient so it doubles as the progress bar. */
  background-color: var(--rcx-color-button-background-primary-default, #095ad2);
  background-image: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.32) 0%,
    rgba(255, 255, 255, 0.32) ${({ progress }) => progress}%,
    transparent ${({ progress }) => progress}%,
    transparent 100%
  );
  transition: background-image 150ms ease-out;

  &:hover {
    background-color: var(--rcx-color-button-background-primary-hover, #10529e);
  }

  &:active {
    background-color: var(--rcx-color-button-background-primary-press, #10529e);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--rcx-color-stroke-extra-light-highlight, #d1ebfe);
  }
`;

/**
 * Monospaced, right-aligned percentage sized to hold two digits plus the percent
 * sign, so the pill keeps a constant width as the number climbs (1% → 47%)
 * instead of nudging the surrounding chrome on every progress tick.
 */
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
  min-width: 3ch;
  text-align: right;
  flex: 0 0 auto;
`;

export const UpdateLabel = () => {
  const { t } = useTranslation();

  const currentVersion = useSelector(({ appVersion }: RootState) => appVersion);
  const newUpdateVersion = useSelector(
    ({ newUpdateVersion }: RootState) => newUpdateVersion
  );
  const updateDownloadStatus = useSelector(
    ({ updateDownloadStatus }: RootState) => updateDownloadStatus
  );
  const updateDownloadProgress = useSelector(
    ({ updateDownloadProgress }: RootState) => updateDownloadProgress
  );

  const reference = useRef<HTMLButtonElement>(null);
  const target = useRef<HTMLDivElement>(null);
  // Widened to HTMLElement so the button anchor and the panel share one generic.
  const { isVisible, toggle } = useDropdownVisibility<HTMLElement>({
    reference,
    target,
  });

  if (!newUpdateVersion) {
    return null;
  }

  const isDownloading = updateDownloadStatus === 'downloading';
  const isDownloaded = updateDownloadStatus === 'downloaded';

  const getLabel = (): string => {
    if (isDownloaded) {
      return t('tabBar.update.restart');
    }

    if (isDownloading) {
      return `${t('tabBar.update.updating')} ${t('tabBar.update.percent', {
        percent: updateDownloadProgress,
      })}`;
    }

    return t('tabBar.update.available');
  };

  // The accessible name stays a single string; the visible content splits the
  // percentage into its own fixed-width element.
  const label = getLabel();

  const handleClick = (): void => {
    if (isDownloaded) {
      dispatch({ type: UPDATES_INSTALL_REQUESTED });
      return;
    }

    // While the download is in flight the pill only reports progress.
    if (isDownloading) {
      return;
    }

    toggle();
  };

  const handleInstallClick = (): void => {
    toggle(false);
    dispatch({ type: UPDATES_DOWNLOAD_REQUESTED });
  };

  const handleSkipClick = (): void => {
    toggle(false);
    dispatch({ type: UPDATES_SKIP_REQUESTED, payload: newUpdateVersion });
  };

  return (
    <>
      <Label
        ref={reference}
        type='button'
        progress={isDownloading ? updateDownloadProgress : 0}
        title={t('tabBar.update.tooltip', { version: newUpdateVersion })}
        aria-label={label}
        aria-haspopup={isDownloaded || isDownloading ? undefined : 'dialog'}
        aria-expanded={isVisible}
        data-update-status={updateDownloadStatus}
        onClick={handleClick}
      >
        {isDownloading ? (
          <>
            <span>{t('tabBar.update.updating')}</span>
            <Percentage data-testid='update-progress'>
              {t('tabBar.update.percent', { percent: updateDownloadProgress })}
            </Percentage>
          </>
        ) : (
          label
        )}
      </Label>
      {isVisible && (
        <Dropdown reference={reference} ref={target} placement='bottom-end'>
          <Box
            display='flex'
            flexDirection='column'
            paddingInline='x12'
            width='x280'
            style={{ WebkitAppRegion: 'no-drag' } as never}
          >
            <Box fontScale='h4'>{t('dialog.update.announcement')}</Box>
            <Box fontScale='p2' color='hint' paddingBlock='x8'>
              {t('dialog.update.message')}
            </Box>

            <Box
              display='flex'
              alignItems='center'
              justifyContent='space-between'
              paddingBlock='x12'
              paddingInline='x12'
              marginBlockEnd='x12'
              bg='tint'
            >
              <Box display='flex' flexDirection='column' alignItems='center'>
                <Box fontScale='c1' color='hint'>
                  {t('dialog.update.currentVersion')}
                </Box>
                <Box fontScale='p2'>{currentVersion}</Box>
              </Box>
              <Chevron right size='x24' />
              <Box display='flex' flexDirection='column' alignItems='center'>
                <Box fontScale='c1' color='hint'>
                  {t('dialog.update.newVersion')}
                </Box>
                <Box fontScale='p2' color='info'>
                  {newUpdateVersion}
                </Box>
              </Box>
            </Box>

            <ButtonGroup stretch>
              <Button type='button' small onClick={handleSkipClick}>
                {t('dialog.update.skip')}
              </Button>
              <Button type='button' small primary onClick={handleInstallClick}>
                {t('dialog.update.install')}
              </Button>
            </ButtonGroup>
          </Box>
        </Dropdown>
      )}
    </>
  );
};

export default UpdateLabel;
