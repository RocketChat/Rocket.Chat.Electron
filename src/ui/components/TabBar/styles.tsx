import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Badge } from '@rocket.chat/fuselage';

/**
 * Fill shared by the selected tab, tab hover, dividers and the strip border.
 *
 * Over the opaque window it uses the solid sidebar surface. Over a transparent
 * window it becomes a translucent overlay that inverts with the palette — a
 * subtle darkening in light mode and a subtle brightening in dark mode — so the
 * selected tab always contrasts with whatever shows through.
 */
const CHROME_FILL_OPAQUE = 'var(--rcx-color-surface-sidebar, #2f343d)';
const CHROME_FILL_OVERLAY_LIGHT = 'rgba(0, 0, 0, 0.125)';
const CHROME_FILL_OVERLAY_DARK = 'rgba(255, 255, 255, 0.125)';

const resolveChromeFill = (
  paletteTheme: 'light' | 'dark',
  isTransparentWindowEnabled: boolean
): string => {
  if (!isTransparentWindowEnabled) {
    return CHROME_FILL_OPAQUE;
  }

  return paletteTheme === 'dark'
    ? CHROME_FILL_OVERLAY_DARK
    : CHROME_FILL_OVERLAY_LIGHT;
};

type StripProps = {
  isTransparentWindowEnabled: boolean;
  paletteTheme: 'light' | 'dark';
};

export const Strip = styled.div<StripProps>`
  --tab-chrome-fill: ${({ paletteTheme, isTransparentWindowEnabled }) =>
    resolveChromeFill(paletteTheme, isTransparentWindowEnabled)};

  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 0 0 auto;
  width: 100%;
  height: 40px;
  -webkit-app-region: drag;
  user-select: none;
  border-bottom: 1px solid var(--tab-chrome-fill);
  background-color: ${({ isTransparentWindowEnabled }) =>
    isTransparentWindowEnabled
      ? 'transparent'
      : 'var(--rcx-color-surface-tint, #ffffff)'};
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

export const TabList = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  flex: 1 1 auto;
  min-width: 0;
  gap: 1px;
  padding-left: 8px;
  overflow: hidden;
  -webkit-app-region: drag;
`;

export const DragSpacer = styled.div`
  flex: 0 0 44px;
  -webkit-app-region: drag;
`;

type AddButtonWrapperProps = {
  isTransparentWindowEnabled: boolean;
};

export const AddButtonWrapper = styled.div<AddButtonWrapperProps>`
  display: flex;
  align-items: flex-start;
  align-self: flex-end;
  height: 32px;
  flex: 0 0 auto;
  -webkit-app-region: no-drag;

  /* Over a transparent window, match the add button's hover to the tab hover
     fill instead of the opaque fuselage default. The '& button:hover' selector
     outranks fuselage's '.rcx-button--icon:hover'. */
  ${({ isTransparentWindowEnabled }) =>
    isTransparentWindowEnabled &&
    css`
      & button:hover {
        background-color: var(--tab-chrome-fill);
        border-color: var(--tab-chrome-fill);
      }
    `}
`;

type TabProps = {
  isSelected: boolean;
  isCompact: boolean;
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
  gap: 6px;
  flex: 0 1 auto;
  width: 230px;
  min-width: 52px;
  max-width: 230px;
  height: 28px;
  align-self: flex-end;
  position: relative;
  padding: ${({ isCompact }) => (isCompact ? '0 6px' : '0 10px')};
  margin-bottom: 4px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  color: var(--rcx-color-font-default, #1f2329);
  border-radius: 8px 8px 0 0;

  ${({ isSelected }) =>
    isSelected
      ? css`
          background-color: var(--tab-chrome-fill);
          margin-bottom: 0px;
          padding-bottom: 4px;
          height: 32px;
          z-index: 1;

          /* Chrome-style concave fillets where the tab meets the strip */
          &::before,
          &::after {
            content: '';
            position: absolute;
            bottom: 0;
            width: 10px;
            height: 10px;
            pointer-events: none;
          }

          &::before {
            left: -10px;
            background: radial-gradient(
              circle at 0 0,
              transparent 10px,
              var(--tab-chrome-fill) 10.5px
            );
          }

          &::after {
            right: -10px;
            background: radial-gradient(
              circle at 100% 0,
              transparent 10px,
              var(--tab-chrome-fill) 10.5px
            );
          }
        `
      : css`
          &:hover {
            transition: background-color 150ms ease;
            background-color: var(--tab-chrome-fill);
            border-radius: 8px;
          }
        `}

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }
`;

export const Divider = styled.div`
  width: 2px;
  height: 16px;
  border-radius: 4px;
  margin-bottom: 10px;
  background-color: var(--tab-chrome-fill);
  transition: opacity 150ms ease;

  /* Each tab renders a trailing divider, so one sits between the last tab and
     the add button automatically. Hide the dangling divider at the strip's
     trailing edge (no add button) and the ones flanking the active or hovered
     tab (its previous sibling via :has, its next sibling via +). Targets
     aria-selected / role='tab' rather than the Tab component selector, which
     needs @emotion/babel-plugin (not enabled). */
  &:last-child,
  &:has(+ [aria-selected='true']),
  [aria-selected='true'] + &,
  &:has(+ [role='tab']:hover),
  [role='tab']:hover + & {
    opacity: 0;
  }
`;

type FaviconProps = {
  visible: boolean;
};

export const Favicon = styled.img<FaviconProps>`
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: contain;
  display: ${({ visible }) => (visible ? 'initial' : 'none')};
`;

type InitialsProps = {
  visible: boolean;
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
`;

export const Label = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
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

export const MeatballButton = styled.button`
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 100%;
  cursor: pointer;
  -webkit-app-region: no-drag;
  color: #ffffff;

  &:hover {
    background-color: rgba(255, 255, 255, 0.12);
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
  color: #ffffff;

  &:hover {
    background-color: ${({ isCloseButton }) =>
      isCloseButton ? '#c42b1c' : 'rgba(255, 255, 255, 0.12)'};
    color: #ffffff;
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
  background-color: var(--rcx-color-surface-tint, #ffffff);
`;

export const TitleBarDragRegion = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-app-region: drag;
  overflow: hidden;
`;

export const TitleBarText = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
`;
