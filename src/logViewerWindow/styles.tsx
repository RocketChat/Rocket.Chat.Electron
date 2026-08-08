import { Global, css } from '@emotion/react';

import type { PaletteTheme, Surfaces } from './appearance';

export const DRAG_REGION_CLASS = 'rcx-log-drag';
export const NO_DRAG_REGION_CLASS = 'rcx-log-no-drag';
export const FILTER_ROW_CLASS = 'rcx-log-filter-row';
export const LOG_ROW_CLASS = 'rcx-log-row';
export const LOG_ROW_ACTIONS_CLASS = 'rcx-log-row__actions';
export const LOG_MARK_CLASS = 'rcx-log-mark';

type LogViewerGlobalStylesProps = {
  isTransparent: boolean;
  paletteTheme: PaletteTheme;
  surfaces: Surfaces;
};

/**
 * Hover, selection and scrollbar chrome that has to live in a stylesheet: the
 * log list renders thousands of rows, so hover state is resolved by CSS instead
 * of per-row React state.
 */
export const LogViewerGlobalStyles = ({
  isTransparent,
  paletteTheme,
  surfaces,
}: LogViewerGlobalStylesProps) => (
  <Global
    styles={css`
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      html,
      body {
        height: 100%;
        margin: 0;
        background-color: ${isTransparent
          ? 'transparent'
          : 'var(--rcx-color-surface-light)'};
      }

      .${DRAG_REGION_CLASS} {
        -webkit-app-region: drag;
      }

      .${NO_DRAG_REGION_CLASS} {
        -webkit-app-region: no-drag;
      }

      .${FILTER_ROW_CLASS}:hover {
        background-color: ${surfaces.hover};
      }

      .${FILTER_ROW_CLASS}:focus-visible {
        background-color: ${surfaces.selected};
      }

      .${LOG_ROW_CLASS}:hover {
        background-color: ${surfaces.hover};
      }

      .${LOG_ROW_ACTIONS_CLASS} {
        opacity: 0;
        transition: opacity 120ms ease-out;
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

      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        border: 2px solid transparent;
        border-radius: 6px;
        background-clip: content-box;
        background-color: ${paletteTheme === 'dark'
          ? 'rgba(255, 255, 255, 0.22)'
          : 'rgba(0, 0, 0, 0.22)'};
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: ${paletteTheme === 'dark'
          ? 'rgba(255, 255, 255, 0.34)'
          : 'rgba(0, 0, 0, 0.34)'};
      }

      ::-webkit-scrollbar-corner {
        background: transparent;
      }
    `}
  />
);
