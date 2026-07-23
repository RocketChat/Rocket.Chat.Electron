import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Badge } from '@rocket.chat/fuselage';

export type TabOrientation = 'horizontal' | 'vertical';

/**
 * Fill shared by the selected tab, tab hover, dividers and the strip border.
 *
 * Over the opaque window it uses the solid sidebar surface. Over a transparent
 * window it becomes a translucent overlay that inverts with the palette — a
 * subtle darkening in light mode and a subtle brightening in dark mode — so the
 * selected tab always contrasts with whatever shows through.
 */

const resolveChromeFill = (
  paletteTheme: 'light' | 'dark',
  isTransparentWindowEnabled: boolean
): string => {
  const CHROME_FILL_OVERLAY_LIGHT = isTransparentWindowEnabled
    ? 'rgba(255, 255, 255, 0.8)'
    : 'rgba(255, 255, 255, 1)';
  const CHROME_FILL_OVERLAY_DARK = 'rgba(255, 255, 255, 0.1)';

  return paletteTheme === 'dark'
    ? CHROME_FILL_OVERLAY_DARK
    : CHROME_FILL_OVERLAY_LIGHT;
};

const resolveDividerFill = (
  paletteTheme: 'light' | 'dark',
  _isTransparentWindowEnabled: boolean
): string => {
  return paletteTheme === 'dark'
    ? 'rgba(255, 255, 255, 1)'
    : 'rgba(0, 0, 0, 1)';
};

type StripProps = {
  isTransparentWindowEnabled: boolean;
  paletteTheme: 'light' | 'dark';
  orientation?: TabOrientation;
};

export const Strip = styled.div<StripProps>`
  --tab-chrome-fill: ${({ paletteTheme, isTransparentWindowEnabled }) =>
    resolveChromeFill(paletteTheme, isTransparentWindowEnabled)};

  --tab-divider-fill: ${({ paletteTheme, isTransparentWindowEnabled }) =>
    resolveDividerFill(paletteTheme, isTransparentWindowEnabled)};

  display: flex;
  flex-direction: row;
  align-items: center;
  padding: ${process.platform === 'darwin' ? '0px 8px' : '0 0 0 4px'};
  padding-top: ${process.platform === 'darwin' ? '2px' : '0px'};
  flex: 0 0 auto;
  width: 100%;
  height: 40px;
  gap: 3px;
  -webkit-app-region: drag;
  user-select: none;

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      flex-direction: column;
      align-items: center;
      width: 48px;
      height: 100%;
      padding: ${process.platform === 'darwin' ? '8px 0px' : '0 0 8px 0'};
      padding-left: 2px;
    `}
`;

type TrafficLightSpacerProps = {
  collapsed: boolean;
};

export const TrafficLightSpacer = styled.div<TrafficLightSpacerProps>`
  flex: 0 0 auto;
  width: ${({ collapsed }) => (collapsed ? '0px' : '76px')};
  -webkit-app-region: drag;
  transition: width var(--transitions-duration, 100ms);
`;

type TabListProps = {
  orientation?: TabOrientation;
};

export const TabList = styled.div<TabListProps>`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  gap: 1px;
  overflow: hidden;
  -webkit-app-region: drag;

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      flex-direction: column;
      align-items: center;
      width: 100%;
      gap: 4px;
      /* Content-sized so the DragSpacer below can push the trailing slot (the
         settings menu) to the bottom. 'visible' keeps the floating badges,
         which translate past the tab edge, from being clipped. */
      flex: 0 1 auto;
      overflow: visible;
    `}
`;

type DragSpacerProps = {
  orientation?: TabOrientation;
};

export const DragSpacer = styled.div<DragSpacerProps>`
  flex: 0 0 44px;
  -webkit-app-region: drag;

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      flex: 1 1 auto;
    `}
`;

export const AddButtonWrapper = styled.div`
  -webkit-app-region: no-drag;

  & button {
    opacity: 0.6;
    border-radius: ${process.platform === 'darwin' ? '8px' : '4px'};
    transition: background-color 150ms ease;
  }

  & button:hover {
    background-color: var(--tab-chrome-fill);
    border: none;
    opacity: 1;
  }
`;

type TabProps = {
  isSelected: boolean;
  isCompact: boolean;
  orientation?: TabOrientation;
};

export const Tab = styled.button<TabProps>`
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  flex: 0 1 auto;
  width: 235px;
  max-width: 235px;
  min-width: 52px;
  height: 32px;
  position: relative;
  padding: ${({ isCompact }) => (isCompact ? '0 10px' : '0 10px')};
  cursor: pointer;
  -webkit-app-region: no-drag;
  color: var(--rcx-color-font-titles-labels, #f2f3f5);
  border-radius: ${process.platform === 'darwin' ? '8px' : '4px'};
  opacity: 0.6;
  outline: 0px solid
    color-mix(in srgb, var(--tab-divider-fill) 30%, transparent);
  outline-offset: 1px;
  transition:
    background-color 150ms ease,
    opacity 150ms ease,
    outline 150ms ease,
    box-shadow 150ms ease;

  ${({ isSelected }) =>
    isSelected
      ? css`
          background-color: var(--tab-chrome-fill);
          box-shadow: 0 0 4px 0px rgba(0, 0, 0, 0.1);
          opacity: 1;
          z-index: 1;
        `
      : css`
          &:hover {
            background-color: rgb(from var(--tab-chrome-fill) r g b / 0.56);
            background-color: var(--tab-chrome-fill);
            box-shadow: 0 0 4px 0px rgba(0, 0, 0, 0.1);
            opacity: 0.8;
          }
        `}

  ${({ orientation, isSelected }) =>
    orientation === 'vertical' &&
    css`
      /* Square tab: same height as the horizontal tab, width equal to height,
         icon centered so it keeps the same breathing room as horizontal. */
      width: 32px;
      min-width: 32px;
      max-width: 32px;
      height: 32px;
      padding: 0;
      justify-content: center;
      overflow: visible;
      background-color: var(--tab-chrome-fill);

      /* Vertical tabs are icon-only, so keep them at full opacity (sidebar-like)
         rather than dimming idle tabs the way the horizontal strip does. */
      opacity: 1;

      &:hover {
        outline-color: color-mix(
          in srgb,
          var(--tab-divider-fill) 10%,
          transparent
        );
        outline-width: 2px;
        opacity: 1;
      }

      ${isSelected &&
      css`
        outline-width: 2px;
      `}
    `}

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }
`;

type DividerProps = {
  orientation?: TabOrientation;
};

export const Divider = styled.div<DividerProps>`
  width: 1px;
  height: 26px;
  background-color: var(--tab-divider-fill);
  opacity: 0.1;
  transition: opacity 150ms ease;

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      opacity: 0;
      width: 26px;
      height: 1px;
    `}

  /* Each tab renders a trailing divider, so one sits between the last tab and
     the add button automatically. Hide the dangling divider at the strip's
     trailing edge (no add button) and the ones flanking the active or hovered
     tab (its previous sibling via :has, its next sibling via +). Targets
     aria-selected / role='tab' rather than the Tab component selector, which
     needs @emotion/babel-plugin (not enabled). The '+ div button:hover' rule
     hides the divider before the add button (wrapped in a div) when that button
     is hovered. */
  &:last-child,
  &:has(+ [aria-selected='true']),
  [aria-selected='true'] + &,
  &:has(+ [role='tab']:hover),
  [role='tab']:hover + &,
  &:has(+ div button:hover) {
    opacity: 0;
  }
`;

type FaviconProps = {
  visible: boolean;
  orientation?: TabOrientation;
};

export const Favicon = styled.img<FaviconProps>`
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: contain;
  display: ${({ visible }) => (visible ? 'initial' : 'none')};

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      width: 28px;
      height: 28px;
    `}
`;

type InitialsProps = {
  visible: boolean;
  orientation?: TabOrientation;
};

export const Initials = styled.span<InitialsProps>`
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  font-size: 11px;
  border-radius: 4px;
  background-color: var(--rcx-color-surface-neutral, #e4e7ea);
  display: ${({ visible }) => (visible ? 'initial' : 'none')};

  ${({ orientation }) =>
    orientation === 'vertical' &&
    css`
      width: 28px;
      height: 28px;
      line-height: 28px;
      font-size: 13px;
      background-color: transparent;
    `}
`;

export const Label = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  line-height: 12px;
  text-align: left;
`;

export const ShortcutChip = styled.span`
  flex: 0 0 auto;
  font-size: 11px;
  opacity: 0.7;
`;

export const TabBadge = styled(Badge)`
  flex-shrink: 0;
`;

/* Floats the mention/warning badges over the top-right corner of a vertical
   tab, matching the sidebar's ServerButton badge placement. */
export const BadgeWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 2px;
  transform: translate(20%, -20%);
  pointer-events: none;
`;

/* Small unread indicator for vertical tabs that have unread messages but no
   mention count (badge === '•'). */
export const UnreadDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--rcx-color-badge-background-level-2, #f38c39);
`;

export const MeatballButton = styled.button`
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: ${process.platform === 'darwin' ? '8px' : '4px'};
  cursor: pointer;
  -webkit-app-region: no-drag;
  color: var(--rcx-color-font-titles-labels, #f2f3f5);

  &:hover {
    background-color: var(
      --tab-chrome-fill,
      var(--rcx-color-surface-hover, rgba(0, 0, 0, 0.06))
    );
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }
`;

export const WindowControlsGroup = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 0 0 auto;
  height: 100%;
  -webkit-app-region: no-drag;
`;

type WindowControlButtonProps = {
  isCloseButton?: boolean;
};

export const WindowControlButton = styled.button<WindowControlButtonProps>`
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 46px;
  height: 100%;
  cursor: pointer;
  -webkit-app-region: no-drag;
  color: var(--rcx-color-font-titles-labels, #f2f3f5);
  transition:
    background-color 150ms ease,
    color 150ms ease;

  &:hover {
    background-color: ${({ isCloseButton }) =>
      isCloseButton
        ? '#c42b1c'
        : 'var(--tab-chrome-fill, var(--rcx-color-surface-hover, rgba(0, 0, 0, 0.06)))'};
    color: ${({ isCloseButton }) =>
      isCloseButton
        ? '#ffffff'
        : 'var(--rcx-color-font-titles-labels, #f2f3f5)'};
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }
`;

export const TitleBarStrip = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 0 0 auto;
  width: 100%;
  height: 32px;
  -webkit-app-region: drag;
  user-select: none;
`;

export const TitleBarDragRegion = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  -webkit-app-region: drag;
  overflow: hidden;
  padding: 0px 10px;
`;
