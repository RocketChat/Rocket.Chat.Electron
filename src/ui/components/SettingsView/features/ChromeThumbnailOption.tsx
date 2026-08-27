import styled from '@emotion/styled';
import { Box } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';

import type { NavigationLayout } from '../../../common';
import type {
  ThumbnailPlatform,
  ThumbnailTheme,
} from './WindowChromeThumbnail';
import { WindowChromeThumbnail } from './WindowChromeThumbnail';
import {
  THUMBNAIL_FRAME_BORDER,
  THUMBNAIL_FRAME_PADDING,
} from './thumbnailMetrics';

/**
 * A real radio input, only visually hidden.
 *
 * Hiding rather than replacing it keeps native radio-group behaviour — arrow
 * keys move between options, `disabled` actually disables, and the element still
 * reports as checked to assistive tech and to tests — none of which a
 * hand-rolled `role="radio"` div gets for free.
 */
const VisuallyHiddenRadio = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;

const OptionLabel = styled.label<{ isDisabled: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  cursor: ${({ isDisabled }) => (isDisabled ? 'default' : 'pointer')};
  opacity: ${({ isDisabled }) => (isDisabled ? 0.4 : 1)};
`;

const Frame = styled.span<{ isSelected: boolean; radius: number }>`
  display: block;
  padding: ${THUMBNAIL_FRAME_PADDING}px;
  border-radius: ${({ radius }) => radius + 2}px;
  border: ${THUMBNAIL_FRAME_BORDER}px solid
    ${({ isSelected }) =>
      isSelected ? 'var(--rcx-color-stroke-highlight)' : 'transparent'};

  input:focus-visible + & {
    border-color: var(--rcx-color-stroke-highlight);
    box-shadow: 0 0 0 2px var(--rcx-color-stroke-extra-light-highlight);
  }
`;

export type ChromeThumbnailOptionProps = {
  /** Shared across the group, which is what makes them mutually exclusive. */
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  title?: string;
  layout: NavigationLayout;
  theme: ThumbnailTheme;
  platform?: ThumbnailPlatform;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

/** One thumbnail in a picker: preview, selection ring and caption. */
export const ChromeThumbnailOption = ({
  name,
  value,
  label,
  checked,
  disabled = false,
  title,
  layout,
  theme,
  platform,
  onChange,
}: ChromeThumbnailOptionProps) => (
  <OptionLabel isDisabled={disabled} title={title}>
    <VisuallyHiddenRadio
      type='radio'
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
    <Frame isSelected={checked} radius={11}>
      <WindowChromeThumbnail
        layout={layout}
        theme={theme}
        platform={platform}
        idPrefix={`${name}-${value}`}
      />
    </Frame>
    {/* c1 and c2 are both 12px, differing only in weight — so the selected
        caption bolds without fighting the !important that fontScale emits. */}
    <Box fontScale={checked ? 'c2' : 'c1'} color={checked ? 'default' : 'hint'}>
      {label}
    </Box>
  </OptionLabel>
);
