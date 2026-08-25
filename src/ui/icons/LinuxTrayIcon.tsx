import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';
import { PRESENCE_COLORS } from './presenceColors';

type LinuxTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
  disconnected?: boolean;
};

// Linux has no taskbar badge, so the unread count still needs to be baked
// into the tray icon: presence + badge keeps the presence-coloured numeral
// (`Badge`); presence + no badge shows the plain status bullet glyph; no
// presence falls back to the existing grey badge/no-badge behaviour.
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
  } else if (presence && badge) {
    overlay = (
      <Badge value={badge} backgroundColor={PRESENCE_COLORS[presence]} />
    );
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

export default LinuxTrayIcon;
