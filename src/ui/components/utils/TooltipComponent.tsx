import {
  Tooltip,
  PositionAnimated,
  AnimatedVisibility,
} from '@rocket.chat/fuselage';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { useRef } from 'react';

type Placement = ComponentProps<typeof PositionAnimated>['placement'];

type TooltipComponentProps = {
  title: ReactNode;
  anchor: Element;
};

export const TooltipComponent = ({
  title,
  anchor,
}: TooltipComponentProps): ReactElement<any> => {
  const ref = useRef(anchor);

  // Anchors may opt into a different side (e.g. vertical tabs open to the
  // right); default to the usual bottom-start otherwise.
  const placement =
    (anchor.getAttribute('data-tooltip-placement') as Placement) ??
    'bottom-start';

  return (
    <PositionAnimated
      anchor={ref}
      placement={placement}
      margin={8}
      visible={AnimatedVisibility.UNHIDING}
    >
      <Tooltip>{title}</Tooltip>
    </PositionAnimated>
  );
};
