import { Box } from '@rocket.chat/fuselage';
import type { ReactNode, MouseEvent, ReactElement } from 'react';
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';

import { TooltipComponent } from './TooltipComponent';

type TooltipProviderProps = {
  children: ReactNode;
};

type TooltipContextType = {
  onMouseOver: (event: MouseEvent) => void;
  onMouseOut: () => void;
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

  const handleOnMouseOver = (event: MouseEvent): void => {
    if (!tooltip) {
      const title = 'Tooltip Title'; // Replace with your dynamic title logic

      setTooltip(
        <TooltipComponent
          title={
            <>
              <Box>
                {title} ({process.platform === 'darwin' ? '⌘' : '^'}+Shortcut
                Number) {/* Replace with dynamic shortcutNumber */}
              </Box>
              {/* Replace with dynamic logic */}
              <Box>Additional Tooltip Content</Box>
            </>
          }
          anchor={event.currentTarget as HTMLElement}
        />
      );
      lastAnchor.current = event.currentTarget as HTMLElement;
    }
  };

  const handleOnMouseOut = (): void => {
    setTooltip(null);
    lastAnchor.current = null;
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
