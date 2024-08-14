import type { ReactNode, MouseEvent, ReactElement } from 'react';
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';

import { TooltipComponent } from './TooltipComponent'; // Assuming this is the path to your TooltipComponent

type TooltipProviderProps = {
  children: ReactNode;
};

type TooltipContextType = {
  onMouseOver: (event: MouseEvent) => void;
  onMouseOut: (event: MouseEvent) => void;
};

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const useTooltip = (): TooltipContextType => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

const TooltipProvider = ({ children }: TooltipProviderProps): ReactElement => {
  const [tooltip, setTooltip] = useState<ReactElement | null>(null);
  const lastAnchor = useRef<HTMLElement | null>(null);
  const storedTitle = useRef<string | null>(null);

  const handleOnMouseOver = (event: MouseEvent): void => {
    const anchor = event.currentTarget as HTMLElement;
    const title = anchor.getAttribute('title');

    if (!anchor || !title) {
      return;
    }

    // Store the title and remove it to prevent the default tooltip
    storedTitle.current = title;
    anchor.removeAttribute('title');

    // Split the title by newline if it exists
    const lines = title
      .split('\n')
      .map((line, index) => <div key={index}>{line}</div>);

    const formattedTooltip = (
      <TooltipComponent title={<>{lines}</>} anchor={anchor} />
    );

    setTooltip(formattedTooltip);
    lastAnchor.current = anchor;
  };

  const handleOnMouseOut = (event: MouseEvent): void => {
    const anchor = lastAnchor.current;

    // Check if the mouse is leaving the element and its children
    if (
      !anchor ||
      !event.relatedTarget ||
      !anchor.contains(event.relatedTarget as Node)
    ) {
      // Restore the title attribute when the mouse leaves
      if (anchor && storedTitle.current) {
        anchor.setAttribute('title', storedTitle.current);
      }

      setTooltip(null);
      lastAnchor.current = null;
    }
  };

  const contextValue = useMemo(
    () => ({
      onMouseOver: handleOnMouseOver,
      onMouseOut: handleOnMouseOut,
    }),
    [tooltip]
  );

  return (
    <TooltipContext.Provider value={contextValue}>
      {children}
      {tooltip}
    </TooltipContext.Provider>
  );
};

export default memo(TooltipProvider);
