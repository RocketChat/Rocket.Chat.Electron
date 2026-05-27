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
    isDarwin && isTransparentWindowEnabled
      ? 'transparent'
      : 'var(--rcx-color-surface-room, #2f343d)';

  return (
    <Global
      // emotion Global styles, not a Box prop
      // emotion Global css block with layout dimensions
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

// emotion styled-component, -webkit-app-region is platform-specific drag affordance, not convertible to Box props
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

// emotion styled-component with conditional transparent/dark theme, not a Box prop
export const Wrapper = styled.div<WrapperProps>`
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  cursor: default;
  user-select: none;
  background-color: ${({ isTransparentWindowEnabled }) =>
    isDarwin && isTransparentWindowEnabled
      ? 'transparent'
      : 'var(--rcx-color-surface-room, #2f343d)'};
  /* emotion: conditional background-color with theme logic */
  display: flex;
  flex-flow: row nowrap;
`;

export const ViewsWrapper = styled.div`
  position: relative;
  flex: 1 1 auto;
  align-self: stretch;
  max-width: 100%;
`;
