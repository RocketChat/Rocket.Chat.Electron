import { Box } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';

import { TOOLBAR_HEIGHT, TRAFFIC_LIGHTS_INSET, isDarwin } from './appearance';
import { DRAG_REGION_CLASS, NO_DRAG_REGION_CLASS } from './styles';

export type WindowToolbarProps = {
  /** Centred title area. */
  children: ReactNode;
  /** Trailing controls; wrapped so they stay clickable inside the drag region. */
  actions?: ReactNode;
};

/**
 * The window's header. On macOS it *is* the title bar — hence the drag region
 * and the room reserved for the traffic lights that float over it — so the
 * window shows one header instead of a native title bar stacked on an in-app
 * one. It paints no background: the window's panel colour shows through.
 */
export const WindowToolbar = ({ children, actions }: WindowToolbarProps) => (
  <Box
    display='flex'
    flexDirection='row'
    alignItems='center'
    flexShrink={0}
    // Both paddings go through Box props: Box emits styling props as
    // `!important`, so an inline `paddingInlineStart` would lose to
    // `paddingInline`.
    paddingInlineStart={isDarwin ? TRAFFIC_LIGHTS_INSET : 12}
    paddingInlineEnd='x12'
    className={isDarwin ? DRAG_REGION_CLASS : undefined}
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
      <Box flexShrink={0} className={NO_DRAG_REGION_CLASS}>
        {actions}
      </Box>
    )}
  </Box>
);
