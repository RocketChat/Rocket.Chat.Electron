import type { UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type MacOSTrayIconProps = {
  notification?: boolean;
  presence?: UserPresence;
  disconnected?: boolean;
};

// By default the tray shows STATUS only and the macOS menu-bar title carries
// the unread count. `notification` is set only for the opt-in unread counter
// tray icon: the pre-4.17 template glyph with a dot, which replaces the
// presence bullet in the same corner.
//
// `DisconnectedBadge`'s amber fill is outside `invertDarkAchromaticPixels`'s
// inversion window (see macOSTrayGlyph.ts): its saturation is well above
// the colour threshold, so it never gets flipped to white along with the
// black rocket glyph.
const MacOSTrayIcon = ({
  notification,
  presence,
  disconnected,
}: MacOSTrayIconProps) => {
  let overlay;
  let cutout;
  if (disconnected) {
    overlay = <DisconnectedBadge />;
    cutout = <PresenceBulletCutout />;
  } else if (notification) {
    overlay = <Badge value={0} backgroundColor='black' />;
  } else if (presence) {
    overlay = <PresenceBullet presence={presence} />;
    cutout = <PresenceBulletCutout />;
  }

  return (
    <svg
      width='100%'
      viewBox='0 0 512 512'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g transform='translate(256, 256) scale(0.8) translate(-256, -256)'>
        <AppIcon color='black' cutout={cutout}>
          {overlay}
        </AppIcon>
      </g>
    </svg>
  );
};

export default MacOSTrayIcon;
