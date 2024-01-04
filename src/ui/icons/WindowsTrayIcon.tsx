import type { Server } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';

type WindowsTrayIconProps = {
  badge?: Server['badge'];
};

const WindowsTrayIcon = ({ badge }: WindowsTrayIconProps) => {
  const color = '#9EA2A8';

  return <AppIcon color={color}>{!!badge && <Badge value={badge} />}</AppIcon>;
};

export default WindowsTrayIcon;
