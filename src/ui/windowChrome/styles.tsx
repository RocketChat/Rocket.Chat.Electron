import { Global, css } from '@emotion/react';

import type { PaletteTheme, Surfaces } from './appearance';

export const DRAG_REGION_CLASS = 'rcx-window-drag';
export const NO_DRAG_REGION_CLASS = 'rcx-window-no-drag';
export const FILTER_ROW_CLASS = 'rcx-window-filter-row';
export const TEXT_BUTTON_CLASS = 'rcx-window-text-button';
export const SEARCH_FIELD_CLASS = 'rcx-window-search-field';
export const LIST_ROW_CLASS = 'rcx-window-list-row';

type WindowChromeGlobalStylesProps = {
  paletteTheme: PaletteTheme;
  surfaces: Surfaces;
};

/**
 * Chrome shared by the secondary windows: the window background, the macOS drag
 * regions, sidebar filter hover and scrollbars.
 *
 * Hover lives here rather than in React state because these lists can run to
 * thousands of rows, and per-row state would re-render on every pointer move.
 */
export const WindowChromeGlobalStyles = ({
  surfaces,
}: WindowChromeGlobalStylesProps) => (
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
        background-color: ${surfaces.panel};
        color: var(--rcx-color-font-default);
      }

      .${DRAG_REGION_CLASS} {
        -webkit-app-region: drag;
      }

      .${NO_DRAG_REGION_CLASS} {
        -webkit-app-region: no-drag;
      }

      .${FILTER_ROW_CLASS}:hover, .${LIST_ROW_CLASS}:hover {
        background-color: ${surfaces.hover};
      }

      /*
       * Keyboard focus draws a highlight ring rather than the selected fill:
       * the fill is what says "this section is open", so borrowing it for focus
       * left two rows claiming to be the current one.
       */
      .${FILTER_ROW_CLASS}:focus-visible {
        outline: 2px solid var(--rcx-color-stroke-highlight);
        outline-offset: -2px;
      }

      .${TEXT_BUTTON_CLASS}:hover {
        text-decoration: underline;
      }

      .${TEXT_BUTTON_CLASS}:focus-visible {
        text-decoration: underline;
        outline: 2px solid var(--rcx-color-stroke-highlight);
        outline-offset: 2px;
      }

      /*
       * Fuselage reads its input fill from this variable, so setting it here
       * lets the search field sit directly on the window material — no
       * specificity war with the component's own rules.
       */
      .${SEARCH_FIELD_CLASS} {
        --rcx-input-colors-background-color: ${surfaces.field};
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
        background-color: color-mix(in srgb, currentColor 22%, transparent);
      }

      ::-webkit-scrollbar-thumb:hover {
        background-color: color-mix(in srgb, currentColor 34%, transparent);
      }

      ::-webkit-scrollbar-corner {
        background: transparent;
      }
    `}
  />
);
