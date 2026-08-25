import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import PresenceBullet from './PresenceBullet';
import PresenceBulletCutout from './PresenceBulletCutout';

type MacOSTrayIconProps = {
  notification?: boolean;
  presence?: UserPresence;
  badge?: Server['badge'];
  disconnected?: boolean;
};

// The badge circle is the same shape, size and position whether or not
// presence is known — only its colour changes. Left as `black` it is a
// template image and macOS renders it monochrome with the glyph; given a
// presence colour the asset is no longer a template, so the colour survives.
//
// When presence is known, the tray shows presence ONLY — no unread count —
// because the macOS menu-bar title already carries the count. `badge` is
// therefore ignored whenever `presence` is set.
//
// `DisconnectedBadge`'s amber fill is outside `invertDarkAchromaticPixels`'s
// inversion window (see macOSTrayGlyph.ts): its saturation is well above
// the colour threshold, so it never gets flipped to white along with the
// black rocket glyph.
const MacOSTrayIcon = ({
  notification,
  presence,
  badge,
  disconnected,
}: MacOSTrayIconProps) => {
  let overlay;
  let cutout;
  if (disconnected) {
    overlay = <DisconnectedBadge />;
    cutout = <PresenceBulletCutout />;
  } else if (presence) {
    overlay = <PresenceBullet presence={presence} />;
    cutout = <PresenceBulletCutout />;
  } else if (notification) {
    overlay = <Badge value={badge ?? 0} backgroundColor='black' />;
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
