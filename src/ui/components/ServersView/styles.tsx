import { css } from '@emotion/react';
import styled from '@emotion/styled';

type WrapperProps = {
  isVisible: boolean;
};

export const Wrapper = styled.section<WrapperProps>`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: #2f343d;

  ${({ isVisible }) =>
    css`
      display: ${isVisible ? 'flex' : 'none'};
    `};
`;

type StyledWebViewProps = {
  isFailed: boolean;
};

export const StyledWebView = styled('webview', {
  shouldForwardProp: (propName) =>
    propName === 'partition' ||
    propName === 'allowpopups' ||
    propName === 'webpreferences',
})<StyledWebViewProps>`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;

  ${({ isFailed }) =>
    css`
      display: ${isFailed ? 'none' : 'flex'};
    `}
`;

type ErrorPaneProps = {
  isVisible: boolean;
};

export const ErrorPane = styled.div<ErrorPaneProps>`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;

  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  user-select: none;

  ${({ isVisible }) =>
    css`
      display: ${isVisible ? 'flex' : 'none'};
    `}
`;
