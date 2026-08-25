import type { UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type LinuxTrayIconProps = {
  presence?: UserPresence;
  disconnected?: boolean;
};

// Linux is status-only, same as macOS/Windows — the unread count lives in
// the tray tooltip instead of the icon.
const LinuxTrayIcon = ({ presence, disconnected }: LinuxTrayIconProps) => {
  let overlay;
  let cutout;
  if (disconnected) {
    overlay = <DisconnectedBadge />;
    cutout = <PresenceBulletCutout />;
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
