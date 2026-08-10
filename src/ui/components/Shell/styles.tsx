import { Global, css } from '@emotion/react';
import styled from '@emotion/styled';

import { isDarwin, isLinux } from '../../utils/platform';

type GlobalStylesProps = {
  isTransparentWindowEnabled: boolean;
};

/** Linux paints the outer window shape in CSS (DWM already rounds Windows). */
const usesLinuxClientChromeRounding = isLinux;

export const GlobalStyles = ({
  isTransparentWindowEnabled,
}: GlobalStylesProps) => {
  const backgroundColor =
    (isDarwin && isTransparentWindowEnabled) || usesLinuxClientChromeRounding
      ? 'transparent'
      : 'var(--rcx-color-surface-sidebar, #2f343d)';

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

        html,
        body,
        #root {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
        }

        body {
          -webkit-font-smoothing: antialiased;
          padding: 0;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            Roboto,
            Oxygen,
            Ubuntu,
            Cantarell,
            'Helvetica Neue',
            sans-serif;
          font-size: 0.875rem;
          line-height: 1rem;
          background-color: ${backgroundColor};
        }
      `}
    />
  );
};

/** Outer shell radius for client-decorated windows (not maximized). */
export const CLIENT_CHROME_CORNER_RADIUS_PX = 10;

export const WindowDragBar = styled.div`
  position: fixed;
  width: 100vw;
  height: 22px;
  -webkit-app-region: drag;
  user-select: none;
`;

export const Wrapper = styled.div`
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  cursor: default;
  user-select: none;
  display: flex;
  flex-flow: row nowrap;
`;

export const ViewsWrapper = styled.div`
  position: relative;
  flex: 1 1 auto;
  align-self: stretch;
  max-width: 100%;
`;
