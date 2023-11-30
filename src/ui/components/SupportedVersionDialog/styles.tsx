import styled from '@emotion/styled';
import { css } from '@rocket.chat/css-in-js';

type WrapperProps = {
  isVisible: boolean;
};

export const Wrapper = styled.section<WrapperProps>`
  z-index: 1000;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  cursor: default;
  user-select: none;
  border: 0;
  background-color: transparent;
  max-height: 90vh;

  ${({ isVisible }) =>
    !isVisible &&
    css`
      display: none;
    `}
`;
