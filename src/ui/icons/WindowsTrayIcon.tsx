import type { UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type WindowsTrayIconProps = {
  presence?: UserPresence;
  disconnected?: boolean;
};

// The tray shows STATUS only — no unread count is ever baked into the
// artwork, because the Windows taskbar overlay already carries the count.
// There is no "unread, presence unknown" fallback asset: when presence is
// unknown the icon is always the default icon.
const WindowsTrayIcon = ({ presence, disconnected }: WindowsTrayIconProps) => {
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

export default WindowsTrayIcon;
