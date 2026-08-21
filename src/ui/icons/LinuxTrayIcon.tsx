import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import PresenceDot from './PresenceDot';

type LinuxTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
};

const LinuxTrayIcon = ({ badge, presence }: LinuxTrayIconProps) => {
  const color = '#9EA2A8';

  return (
    <AppIcon color={color}>
      {!!presence && (
        <svg x='0' y='0' width='50%' height='100%'>
          <PresenceDot presence={presence} />
        </svg>
      )}
      {!!badge && (
        <svg x='50%' y='0' width='50%' height='100%'>
          <Badge value={badge} />
        </svg>
      )}
    </AppIcon>
  );
};

export default LinuxTrayIcon;
