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

// By default the tray shows STATUS only and the Windows taskbar overlay
// carries the unread count. `badge` is passed only when the user opted into
// the unread counter tray icon (the pre-4.17 artwork), which replaces the
// presence bullet in the same corner.
const WindowsTrayIcon = ({
  badge,
  presence,
  disconnected,
}: WindowsTrayIconProps) => {
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

export default WindowsTrayIcon;
