import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { withTooltip } from './withTolltip';

type WrapperProps = {
  sideBarStyle: {
    // background?: string;
    // color?: string;
    // border?: string;
  };
  isVisible: boolean;
  // customTheme?: string;
};

export const Wrapper = styled.div<WrapperProps>``;

type ContentProps = {
  withWindowButtons: boolean;
};

export const Content = styled.div<ContentProps>`
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  padding-top: 10px;
  align-items: stretch;

  ${({ withWindowButtons }) =>
    withWindowButtons &&
    css`
      padding-top: 28px;
    `}
`;

export const ServerList = styled.ol`
  -webkit-app-region: no-drag;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
  align-items: center;
`;

type ServerButtonWrapperProps = {
  isDragged: boolean;
  hasUnreadMessages: boolean;
  isSelected: boolean;
  tooltip: string;
};

export const ServerButtonWrapper = styled.li<ServerButtonWrapperProps>`
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  margin: 4px 0;
  font-size: 24px;
  line-height: 1.25;
  display: flex;
  cursor: pointer;
  color: inherit;
  align-items: center;
  flex-flow: row wrap;
  justify-content: space-between;
  margin-left: 8px;
  margin-right: 8px;

  ${({ isDragged }) =>
    isDragged &&
    css`
      opacity: 0.5;
    `}

  ${withTooltip}
`;

type InitialsProps = {
  visible: boolean;
};

export const Initials = styled.span<InitialsProps>`
  line-height: 42px;

  ${({ visible }) => css`
    display: ${visible ? 'initial' : 'none'};
  `}
`;

type FaviconProps = {
  visible: boolean;
};

export const Favicon = styled.img<FaviconProps>`
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  ${({ visible }) => css`
    display: ${visible ? 'initial' : 'none'};
  `}
`;

type AvatarProps = {
  isSelected: boolean;
};

export const Avatar = styled.span<AvatarProps>`
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: center;
  height: 42px;
  transition: opacity var(--transitions-duration);

  ${({ isSelected }) => css`
    opacity: ${isSelected ? '1' : '0.6'};
  `}

  &:hover {
    ${({ isSelected }) => css`
      opacity: ${isSelected ? '1' : '0.8'};
    `}
  }
`;

export const AddServerButton = styled.button`
  -webkit-app-region: no-drag;
  font-family: inherit;
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  margin: 4px 0;
  font-size: 2.5rem;
  line-height: 1.25;
  display: flex;
  flex-direction: row;
  height: 40px;
  padding: 0;
  color: inherit;
  border: none;
  background: none;
  align-items: center;
  justify-content: center;
`;

type AddServerButtonLabelProps = {
  tooltip: string;
};

export const AddServerButtonLabel = styled.span<AddServerButtonLabelProps>`
  display: block;
  line-height: 30px;
  width: 40px;
  height: 40px;
  transition: opacity var(--transitions-duration);
  opacity: 0.6;
  color: inherit;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: pointer;

  &:hover {
    opacity: 1;
  }

  ${withTooltip}
`;

type SidebarActionButtonProps = {
  isSelected?: boolean;
  tooltip: string;
};

export const SidebarActionButton = styled.span<SidebarActionButtonProps>`
  -webkit-app-region: no-drag;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  line-height: 30px;
  transition: opacity var(--transitions-duration);
  opacity: 0.6;
  color: inherit;
  background: rgba(0, 0, 0, 0);
  cursor: pointer;

  ${({ isSelected }) =>
    isSelected &&
    css`
      opacity: 1;
    `}

  &:hover {
    opacity: 1;
  }

  ${withTooltip}
`;

export const BottomButtons = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 16px;
`;

export const Button = styled.button`
  position: relative;
  height: 40px;
  border: none;
  padding: 0;
  margin-top: 14px;
  font-size: 2.5rem;
  line-height: 1.25;
  background: rgba(0, 0, 0, 0);
  color: inherit;
  font-family: inherit;
`;
