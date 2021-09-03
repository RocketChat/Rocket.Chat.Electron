import { css, SerializedStyles } from '@emotion/react';

export const withTooltip = ({
  tooltip,
}: {
  tooltip: string;
}): SerializedStyles => css`
  &::after {
    position: absolute;
    top: 50%;
    left: 100%;
    display: block;
    visibility: hidden;
    padding: 0.5rem 1rem;
    content: ${JSON.stringify(tooltip)};
    transition: all var(--transitions-duration) ease-out
      var(--transitions-duration);
    transform: translate(10px, -50%);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    color: #ffffff;
    border-radius: 2px;
    background-color: #1f2329;
    font-size: 0.875rem;
    line-height: normal;
    z-index: 100000;
  }

  &:hover::after {
    visibility: visible;
    transform: translate(0, -50%);
    opacity: 1;
  }
`;
