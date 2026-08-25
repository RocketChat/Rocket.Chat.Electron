import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type WindowsTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
  disconnected?: boolean;
};

// When presence is known, the tray shows presence ONLY — no unread count —
// because the Windows taskbar overlay already carries the count. `badge` is
// therefore ignored whenever `presence` is set.
const WindowsTrayIcon = ({
  badge,
  presence,
  disconnected,
}: WindowsTrayIconProps) => {
  let overlay;
  let cutout;
  if (disconnected) {
    overlay = <DisconnectedBadge />;
  } else if (presence) {
    overlay = <PresenceBullet presence={presence} />;
    cutout = <PresenceBulletCutout />;
  } else if (badge) {
    overlay = <Badge value={badge} />;
  }

  return (
    <AppIcon color='#9EA2A8' cutout={cutout}>
      {overlay}
    </AppIcon>
  );
};

export default WindowsTrayIcon;
