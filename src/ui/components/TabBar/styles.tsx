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
};

export const Strip = styled.div<StripProps>`
  --tab-chrome-fill: ${({ paletteTheme, isTransparentWindowEnabled }) =>
    resolveChromeFill(paletteTheme, isTransparentWindowEnabled)};

  --tab-divider-fill: ${({ paletteTheme, isTransparentWindowEnabled }) =>
    resolveDividerFill(paletteTheme, isTransparentWindowEnabled)};

  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding-top: 2px;
  flex: 0 0 auto;
  width: 100%;
  height: 40px;
  -webkit-app-region: drag;
  user-select: none;
  background-color: ${({ isTransparentWindowEnabled }) =>
    isTransparentWindowEnabled
      ? 'transparent'
      : 'var(--rcx-color-surface-hover, #ffffff)'};
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
  align-items: center;
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
  -webkit-app-region: no-drag;

  & button {
    opacity: 0.6;
    transition: background-color 150ms ease;
  }

  /* Over a transparent window, match the add button's hover to the tab hover
     fill instead of the opaque fuselage default. The '& button:hover' selector
     outranks fuselage's '.rcx-button--icon:hover'. */
  ${({ isTransparentWindowEnabled }) =>
    isTransparentWindowEnabled &&
    css`
      & button:hover {
        background-color: var(--tab-chrome-fill);
        border: none;
        opacity: 1;
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
  border-radius: 4px;
  opacity: 0.6;
  transition:
    background-color 150ms ease,
    opacity 150ms ease,
    box-shadow 150ms ease;

  ${({ isSelected }) =>
    isSelected
      ? css`
          background-color: var(--tab-chrome-fill);
          box-shadow: 0 0 4px 0px #00000010;
          opacity: 1;
          z-index: 1;
        `
      : css`
          &:hover {
            // background-color: color-mix(in srgb, var(--tab-chrome-fill) 56%, transparent);
            background-color: rgb(from var(--tab-chrome-fill) r g b / 0.56);
            // border-radius: 8px;
            background-color: var(--tab-chrome-fill);
            box-shadow: 0 0 4px 0px #00000010;
            opacity: 0.8;
          }
        `}

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
  }
`;

export const Divider = styled.div`
  width: 1px;
  height: 26px;
  background-color: var(--tab-divider-fill);
  opacity: 0.1;
  transition: opacity 150ms ease;

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
