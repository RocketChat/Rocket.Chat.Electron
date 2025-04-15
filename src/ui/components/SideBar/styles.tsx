import { css } from '@emotion/react';
import styled from '@emotion/styled';

type ServerButtonWrapperProps = {
  isDragged: boolean;
  hasUnreadMessages: boolean;
  isSelected: boolean;
  tooltip?: string;
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

  &::before {
    position: absolute;
    width: 4px;
    height: 0;
    left: -8px;
    content: '';
    transition:
      height var(--transitions-duration),
      opacity var(--transitions-duration);
    border-radius: 0 4px 4px 0;

    background-color: var(
      --rcx-color-surface-selected,
      var(--rcx-color-neutral-450, #d7dbe0)
    ) !important;

    // background-color: var(
    //   --rcx-color-surface-dark,
    //   var(--rcx-color-neutral-800, #2f343d)
    // ) !important;

    ${({ isSelected }) =>
      isSelected &&
      css`
        height: 28px;
        opacity: 1;
      `}
  }
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
