import { css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import {
  Box,
  Button,
  ButtonGroup,
  Chevron,
  Dropdown,
} from '@rocket.chat/fuselage';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import {
  UPDATES_CHECK_FEEDBACK_DISMISSED,
  UPDATES_DOWNLOAD_REQUESTED,
  UPDATES_INSTALL_REQUESTED,
  UPDATES_OPEN_STORE_PAGE_REQUESTED,
  UPDATES_PANEL_TOGGLED,
  UPDATES_SKIP_REQUESTED,
} from '../../../updates/actions';
import type { UpdateStore } from '../../../updates/common';

/** i18n key for the primary panel action's label, per store. */
const OPEN_STORE_PAGE_LABEL_KEYS: Record<Exclude<UpdateStore, null>, string> = {
  mas: 'dialog.update.openStore.mas',
  windows: 'dialog.update.openStore.windows',
  snap: 'dialog.update.openStore.snap',
  flatpak: 'dialog.update.openStore.flatpak',
};

type LabelVariant = 'primary' | 'success' | 'danger';

const variantColors: Record<
  LabelVariant,
  { default: string; hover: string; press: string }
> = {
  primary: {
    default: 'var(--rcx-color-button-background-primary-default, #095ad2)',
    hover: 'var(--rcx-color-button-background-primary-hover, #10529e)',
    press: 'var(--rcx-color-button-background-primary-press, #10529e)',
  },
  success: {
    default: 'var(--rcx-color-button-background-success-default, #158d65)',
    hover: 'var(--rcx-color-button-background-success-hover, #106d4f)',
    press: 'var(--rcx-color-button-background-success-press, #106d4f)',
  },
  danger: {
    default: 'var(--rcx-color-button-background-danger-default, #ec0d2a)',
    hover: 'var(--rcx-color-button-background-danger-hover, #bb0b21)',
    press: 'var(--rcx-color-button-background-danger-press, #bb0b21)',
  },
};

const pulse = keyframes`
  50% {
    opacity: 0.55;
  }
`;

/**
 * Blue pill in the window chrome announcing an available update.
 *
 * Clicking it opens a panel with the version change plus the install and skip
 * actions. Once the download starts the pill turns into a live percentage, and
 * when it completes it becomes the button that restarts into the new version.
 * `progress` paints a brighter fill across the pill so the percentage reads as a
 * progress bar rather than plain text.
 *
 * It doubles as the transient feedback for a user-initiated update check:
 * `variant` recolors it (success for "up to date", danger for a failed check)
 * and `pulsing` animates it while the check is in flight.
 */
const Label = styled.button<{
  progress: number;
  variant?: LabelVariant;
  pulsing?: boolean;
}>`
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
  background-color: ${({ variant = 'primary' }: { variant?: LabelVariant }) =>
    variantColors[variant].default};
  background-image: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.32) 0%,
    rgba(255, 255, 255, 0.32) ${({ progress }) => progress}%,
    transparent ${({ progress }) => progress}%,
    transparent 100%
  );
  transition: background-image 150ms ease-out;

  ${({ pulsing }) =>
    pulsing &&
    css`
      animation: ${pulse} 1.2s ease-in-out infinite;
    `}

  &:hover:not(:disabled) {
    background-color: ${({ variant = 'primary' }: { variant?: LabelVariant }) =>
      variantColors[variant].hover};
  }

  &:active:not(:disabled) {
    background-color: ${({ variant = 'primary' }: { variant?: LabelVariant }) =>
      variantColors[variant].press};
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--rcx-color-stroke-extra-light-highlight, #d1ebfe);
  }
`;

/**
 * Invisible full-viewport layer that closes the panel on any click outside it.
 *
 * A document-level listener is not enough: the workspace content is a
 * <webview>, and clicks inside it never reach the host document. This layer
 * sits over the webview so those clicks are caught too.
 */
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10;
  -webkit-app-region: no-drag;
`;

/** Holds the panel above the backdrop that closes it. */
const PanelLayer = styled.div`
  position: relative;
  z-index: 11;
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
  const updateCheckStatus = useSelector(
    ({ updateCheckStatus }: RootState) => updateCheckStatus
  );
  const isUpdatingAllowed = useSelector(
    ({ isUpdatingAllowed }: RootState) => isUpdatingAllowed
  );
  const isUpdatingEnabled = useSelector(
    ({ isUpdatingEnabled }: RootState) => isUpdatingEnabled
  );
  const updateStore = useSelector(({ updateStore }: RootState) => updateStore);
  const isStoreUpdate = updateStore !== null;

  const reference = useRef<HTMLButtonElement>(null);
  const target = useRef<HTMLDivElement>(null);

  // The pill leads the title bar on Windows (right after the meatball) and
  // trails it elsewhere, so anchor the panel to the matching edge and let it
  // open inward rather than off the side of the window.
  const placement =
    process.platform === 'win32' ? 'bottom-start' : 'bottom-end';

  // Visibility lives in the store so the About dialog can open the panel after
  // a manual check finds an update.
  const isVisible = useSelector(
    ({ isUpdatePanelOpen }: RootState) => isUpdatePanelOpen
  );

  const toggle = (next?: boolean): void => {
    dispatch({ type: UPDATES_PANEL_TOGGLED, payload: next ?? !isVisible });
  };

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        dispatch({ type: UPDATES_PANEL_TOGGLED, payload: false });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  // The check outcome is transient feedback, not a state the user must act on,
  // so it dismisses itself after a few seconds.
  useEffect(() => {
    if (updateCheckStatus !== 'upToDate' && updateCheckStatus !== 'failed') {
      return undefined;
    }

    const timer = setTimeout(() => {
      dispatch({ type: UPDATES_CHECK_FEEDBACK_DISMISSED });
    }, 6000);

    return () => {
      clearTimeout(timer);
    };
  }, [updateCheckStatus]);

  if (!newUpdateVersion) {
    // In builds that cannot self-update the check listener is never
    // registered, so a requested check would sit at "checking" forever —
    // show nothing instead. Store builds have their own check listener
    // despite isUpdatingAllowed being false, so they stay exempt.
    if (
      (!isStoreUpdate && (!isUpdatingAllowed || !isUpdatingEnabled)) ||
      updateCheckStatus === 'idle'
    ) {
      return null;
    }

    if (updateCheckStatus === 'checking') {
      // Disabled: it reports progress and offers no action yet.
      return (
        <Label
          type='button'
          progress={0}
          pulsing
          disabled
          aria-live='polite'
          data-update-check-status='checking'
        >
          {t('tabBar.update.checking')}
        </Label>
      );
    }

    const isFailed = updateCheckStatus === 'failed';

    return (
      <Label
        type='button'
        progress={0}
        variant={isFailed ? 'danger' : 'success'}
        aria-live='polite'
        title={
          isFailed
            ? undefined
            : t('tabBar.update.upToDateTooltip', { version: currentVersion })
        }
        data-update-check-status={updateCheckStatus}
        onClick={() => dispatch({ type: UPDATES_CHECK_FEEDBACK_DISMISSED })}
      >
        {isFailed
          ? t('tabBar.update.checkFailed')
          : t('tabBar.update.upToDate')}
      </Label>
    );
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

    if (isStoreUpdate) {
      // Nothing to download on this build — hand off to the store's page
      // via a distinct action, so the download-status reducers (which see
      // every FSA) never flip to "downloading".
      dispatch({ type: UPDATES_OPEN_STORE_PAGE_REQUESTED });
      return;
    }

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
        <>
          <Backdrop
            data-testid='update-panel-backdrop'
            onMouseDown={() => toggle(false)}
          />
          <PanelLayer>
            <Dropdown reference={reference} ref={target} placement={placement}>
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
                  <Box
                    display='flex'
                    flexDirection='column'
                    alignItems='center'
                  >
                    <Box fontScale='c1' color='hint'>
                      {t('dialog.update.currentVersion')}
                    </Box>
                    <Box fontScale='p2'>{currentVersion}</Box>
                  </Box>
                  <Chevron right size='x24' />
                  <Box
                    display='flex'
                    flexDirection='column'
                    alignItems='center'
                  >
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
                  <Button
                    type='button'
                    small
                    primary
                    onClick={handleInstallClick}
                  >
                    {updateStore
                      ? t(OPEN_STORE_PAGE_LABEL_KEYS[updateStore])
                      : t('dialog.update.install')}
                  </Button>
                </ButtonGroup>
              </Box>
            </Dropdown>
          </PanelLayer>
        </>
      )}
    </>
  );
};

export default UpdateLabel;
