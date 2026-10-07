import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type LinuxTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
  disconnected?: boolean;
};

// Status-only by default, same as macOS/Windows — the unread count lives in
// the tray tooltip. `badge` is passed only when the user opted into the
// unread counter tray icon, which replaces the presence bullet.
const LinuxTrayIcon = ({
  badge,
  presence,
  disconnected,
}: LinuxTrayIconProps) => {
  let overlay;
  let cutout;
  if (disconnected) {
    overlay = <DisconnectedBadge />;
    cutout = <PresenceBulletCutout />;
  } else if (badge) {
    overlay = <Badge value={badge} />;
  } else if (presence) {
    overlay = <PresenceBullet presence={presence} />;
    cutout = <PresenceBulletCutout />;
  }

  return (
    <AppIcon color='#9EA2A8' cutout={cutout}>
      {overlay}
    </AppIcon>
  );
};

export default LinuxTrayIcon;
