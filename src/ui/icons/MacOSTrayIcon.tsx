import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import { PRESENCE_COLORS } from './presenceColors';

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
// `DisconnectedBadge`'s grey ring stroke and amber warning tick are both
// outside `invertDarkAchromaticPixels`'s inversion window (see
// macOSTrayGlyph.ts): the grey's luma is well above the achromatic
// threshold and the amber's saturation is well above the colour threshold,
// so neither gets flipped to white along with the black rocket glyph.
const MacOSTrayIcon = ({
  notification,
  presence,
  badge,
  disconnected,
}: MacOSTrayIconProps) => (
  <svg
    width='100%'
    viewBox='0 0 512 512'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <g transform='translate(256, 256) scale(0.8) translate(-256, -256)'>
      <AppIcon color='black'>
        {disconnected ? (
          <DisconnectedBadge />
        ) : (
          (notification || presence) && (
            <Badge
              value={badge ?? 0}
              backgroundColor={presence ? PRESENCE_COLORS[presence] : 'black'}
            />
          )
        )}
      </AppIcon>
    </g>
  </svg>
);

export default MacOSTrayIcon;
