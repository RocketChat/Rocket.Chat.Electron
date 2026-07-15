import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { Badge } from '@rocket.chat/fuselage';

type StripProps = {
  isTransparentWindowEnabled: boolean;
};

export const Strip = styled.div<StripProps>`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 0 0 auto;
  width: 100%;
  height: 36px;
  -webkit-app-region: drag;
  user-select: none;
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
  width: ${({ collapsed }) => (collapsed ? '0px' : '82px')};
  -webkit-app-region: drag;
  transition: width var(--transitions-duration, 100ms);
`;

export const TabList = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  flex: 1 1 auto;
  min-width: 0;
  gap: 4px;
  padding-left: 4px;
  overflow: hidden;
  -webkit-app-region: drag;
`;

export const DragSpacer = styled.div`
  flex: 0 0 44px;
  -webkit-app-region: drag;
`;

export const AddButtonWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  align-self: flex-end;
  height: 32px;
  flex: 0 0 auto;
  -webkit-app-region: no-drag;
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
  min-width: 52px;
  max-width: 180px;
  height: 32px;
  align-self: flex-end;
  position: relative;
  padding: ${({ isCompact }) => (isCompact ? '0 6px' : '0 10px')};
  cursor: pointer;
  -webkit-app-region: no-drag;
  color: var(--rcx-color-font-default, #1f2329);
  border-radius: 10px 10px 0 0;

  ${({ isSelected }) =>
    isSelected
      ? css`
          background-color: var(--rcx-color-surface-sidebar, #2f343d);
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
              var(--rcx-color-surface-sidebar, #2f343d) 10.5px
            );
          }

          &::after {
            right: -10px;
            background: radial-gradient(
              circle at 100% 0,
              transparent 10px,
              var(--rcx-color-surface-sidebar, #2f343d) 10.5px
            );
          }
        `
      : css`
          &:hover {
            background-color: var(--rcx-color-surface-neutral, #2d3039);
          }
        `}

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--rcx-color-stroke-highlight, #1d74f5);
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
  font-size: 10px;
  font-weight: 700;
  line-height: 12px;
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
