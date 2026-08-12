import { Global, css } from '@emotion/react';

import type { Surfaces } from '../ui/windowChrome/appearance';

export const LOG_ROW_CLASS = 'rcx-log-row';
export const LOG_ROW_ACTIONS_CLASS = 'rcx-log-row__actions';
export const LOG_MARK_CLASS = 'rcx-log-mark';
export const TIMELINE_SELECTION_CLASS = 'rcx-log-timeline-selection';
export const TIMELINE_PLOT_CLASS = 'rcx-log-timeline-plot';

type LogViewerGlobalStylesProps = {
  surfaces: Surfaces;
};

/**
 * Log-specific rules only; the window background, drag regions, filter hover and
 * scrollbars come from the shared window chrome.
 *
 * Row hover lives in a stylesheet rather than React state because the list runs
 * to thousands of rows and per-row state would re-render on every pointer move.
 */
export const LogViewerGlobalStyles = ({
  surfaces,
}: LogViewerGlobalStylesProps) => (
  <Global
    styles={css`
      .${LOG_ROW_CLASS}:hover {
        background-color: ${surfaces.hover};
      }

      .${LOG_ROW_ACTIONS_CLASS} {
        opacity: 0;
        transition: opacity 0.18s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .${LOG_ROW_ACTIONS_CLASS} {
          transition: none;
        }
      }

      .${LOG_ROW_CLASS}:hover
        .${LOG_ROW_ACTIONS_CLASS},
        .${LOG_ROW_ACTIONS_CLASS}:focus-within {
        opacity: 1;
      }

      .${LOG_MARK_CLASS} {
        border-radius: 2px;
        padding: 0 1px;
        background-color: var(--rcx-color-status-background-warning);
        color: var(--rcx-color-status-font-on-warning);
      }

      .${TIMELINE_PLOT_CLASS}:focus-visible {
        outline: 2px solid var(--rcx-color-stroke-highlight);
        outline-offset: -2px;
      }

      .${TIMELINE_SELECTION_CLASS} {
        position: absolute;
        inset-block: 0;
        pointer-events: none;
        border-radius: 2px;
        border-inline: 1px solid var(--rcx-color-stroke-highlight);
        background-color: color-mix(
          in srgb,
          var(--rcx-color-stroke-highlight) 14%,
          transparent
        );
      }
    `}
  />
);
