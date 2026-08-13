import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { WindowControls } from './WindowControls';
import {
  TOOLBAR_HEIGHT,
  TRAFFIC_LIGHTS_INSET,
  WINDOW_CONTROLS_WIDTH,
  hasInAppTitleBar,
  isDarwin,
  isWindows,
} from './appearance';
import { DRAG_REGION_CLASS, NO_DRAG_REGION_CLASS } from './styles';

const leadingInset = (): number => {
  if (isDarwin) return TRAFFIC_LIGHTS_INSET;
  if (isWindows) return WINDOW_CONTROLS_WIDTH;
  return 12;
};

export type WindowToolbarProps = {
  /** Centred title area. */
  children: ReactNode;
  /** Trailing controls; wrapped so they stay clickable inside the drag region. */
  actions?: ReactNode;
};

/**
 * The window's header, and on macOS and Windows the title bar itself — hence the
 * drag region, the room reserved for the traffic lights that float over it, and
 * the caption buttons drawn into its trailing edge on Windows. Either way the
 * window shows one header instead of a native title bar stacked on an in-app
 * one. It paints no background: the window's panel colour shows through.
 */
export const WindowToolbar = ({ children, actions }: WindowToolbarProps) => (
  <Box
    display='flex'
    flexDirection='row'
    alignItems='stretch'
    flexShrink={0}
    // Both paddings go through Box props: Box emits styling props as
    // `!important`, so an inline `paddingInlineStart` would lose to
    // `paddingInline`.
    paddingInlineStart={leadingInset()}
    // The caption buttons run to the window's edge, as they do natively.
    paddingInlineEnd={isWindows ? 0 : 12}
    className={hasInAppTitleBar ? DRAG_REGION_CLASS : undefined}
    style={{ height: `${TOOLBAR_HEIGHT}px`, userSelect: 'none' }}
  >
    <Box
      display='flex'
      alignItems='center'
      flexGrow={1}
      justifyContent='center'
      style={{ minWidth: 0 }}
    >
      {children}
    </Box>
    {actions && (
      <Box
        display='flex'
        alignItems='center'
        flexShrink={0}
        className={NO_DRAG_REGION_CLASS}
      >
        {actions}
      </Box>
    )}
    {isWindows && <WindowControls />}
  </Box>
);
