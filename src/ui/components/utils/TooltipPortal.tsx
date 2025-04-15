import type { ReactNode } from 'react';
import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { createAnchor } from './createAnchor';
import { deleteAnchor } from './deleteAnchor';

type TooltipPortalProps = {
  children?: ReactNode;
};

const TooltipPortal = ({ children }: TooltipPortalProps) => {
  const [tooltipRoot] = useState(() => createAnchor('tooltip-root'));
  useEffect(() => (): void => deleteAnchor(tooltipRoot), [tooltipRoot]);
  return <>{createPortal(children, tooltipRoot)}</>;
};

export default memo(TooltipPortal);
