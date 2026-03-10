import { Global, css } from '@emotion/react';
import styled from '@emotion/styled';

import { isDarwin } from '../../utils/platform';

type GlobalStylesProps = {
  isTransparentWindowEnabled: boolean;
};

export const GlobalStyles = ({
  isTransparentWindowEnabled,
}: GlobalStylesProps) => {
  const backgroundColor =
    isDarwin && isTransparentWindowEnabled ? 'transparent' : '#2f343d';

  return (
    <Global
      styles={css`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        :focus {
          outline: 0 !important;
          outline-style: none;
          outline-color: transparent;
        }

        body {
          -webkit-font-smoothing: antialiased;
          margin: 0;
          padding: 0;
          font-family: system-ui;
          font-size: 0.875rem;
          line-height: 1rem;
          background-color: ${backgroundColor};
        }
      `}
    />
  );
};

export const WindowDragBar = styled.div`
  position: fixed;
  width: 100vw;
  height: 22px;
  -webkit-app-region: drag;
  user-select: none;
`;

type WrapperProps = {
  isTransparentWindowEnabled: boolean;
};

export const Wrapper = styled.div<WrapperProps>`
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  cursor: default;
  user-select: none;
  background-color: ${({ isTransparentWindowEnabled }) =>
    isDarwin && isTransparentWindowEnabled ? 'transparent' : '#2f343d'};
  display: flex;
  flex-flow: row nowrap;
`;

export const ViewsWrapper = styled.div`
  position: relative;
  flex: 1 1 auto;
  align-self: stretch;
  max-width: 100%;
`;
