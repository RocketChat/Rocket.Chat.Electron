import type { ReactElement } from 'react';
import { createContext } from 'react';

type TooltipPayload = ReactElement<any>;

export type TooltipContextValue = {
  open: (payload: TooltipPayload, anchor: HTMLElement) => void;
  close: () => void;
};

export const TooltipContext = createContext<TooltipContextValue>({
  open: () => undefined,
  close: () => undefined,
});
