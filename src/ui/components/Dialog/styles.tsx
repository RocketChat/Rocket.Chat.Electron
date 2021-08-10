import styled from '@emotion/styled';

export const Wrapper = styled.dialog`
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

  &:not([open]) {
    display: none;
  }
`;
