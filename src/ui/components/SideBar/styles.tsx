import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { withTooltip } from './withTolltip';

type ServerButtonWrapperProps = {
  isDragged: boolean;
  hasUnreadMessages: boolean;
  isSelected: boolean;
  tooltip: string;
};

export const ServerButtonWrapper = styled.li<ServerButtonWrapperProps>`
  position: relative;
  display: flex;

  list-style-type: none;
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

export const Avatar = styled.span<AvatarProps>``;
