import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import DisconnectedBadge from './DisconnectedBadge';
import NeutralBullet from './NeutralBullet';
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
//
// When presence is unknown and a badge is pending, the icon is a solid
// neutral-grey disc (`NeutralBullet`), matching macOS's
// `notificationTemplate.png`: as a template image it always renders as a
// solid monochrome disc regardless of the badge value baked into it, so
// Windows renders the same shape/colour here instead of the legacy red
// numeral badge — the two platforms must look identical for this state.
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
  } else if (presence) {
    overlay = <PresenceBullet presence={presence} />;
    cutout = <PresenceBulletCutout />;
  } else if (badge) {
    overlay = <NeutralBullet />;
    cutout = <PresenceBulletCutout />;
  }

  return (
    <AppIcon color='#9EA2A8' cutout={cutout}>
      {overlay}
    </AppIcon>
  );
};

export default WindowsTrayIcon;
