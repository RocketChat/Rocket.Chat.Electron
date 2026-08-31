import type { UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type MacOSTrayIconProps = {
  presence?: UserPresence;
  disconnected?: boolean;
};

// The tray shows STATUS only — no unread count is ever baked into the
// artwork, because the macOS menu-bar title already carries the count. There
// is no "unread, presence unknown" fallback asset: when presence is unknown
// the icon is always the default template icon.
//
// `DisconnectedBadge`'s amber fill is outside `invertDarkAchromaticPixels`'s
// inversion window (see macOSTrayGlyph.ts): its saturation is well above
// the colour threshold, so it never gets flipped to white along with the
// black rocket glyph.
const MacOSTrayIcon = ({ presence, disconnected }: MacOSTrayIconProps) => {
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
