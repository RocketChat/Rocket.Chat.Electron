import React, { FC } from 'react';

import type { Server } from '../../common/types/Server';
import AppIcon from './AppIcon';
import Badge from './Badge';

type LinuxTrayIconProps = {
  badge?: Server['badge'];
};

const LinuxTrayIcon: FC<LinuxTrayIconProps> = ({ badge }) => {
  const color = '#9EA2A8';

  return <AppIcon color={color}>{!!badge && <Badge value={badge} />}</AppIcon>;
};

export default LinuxTrayIcon;
