import type { UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import { PRESENCE_COLORS } from './presenceColors';

type MacOSTrayIconProps = {
  notification?: boolean;
  presence?: UserPresence;
};

// The badge circle is the same shape, size and position whether or not
// presence is known — only its colour changes. Left as `black` it is a
// template image and macOS renders it monochrome with the glyph; given a
// presence colour the asset is no longer a template, so the colour survives.
const MacOSTrayIcon = ({ notification, presence }: MacOSTrayIconProps) => (
  <svg
    width='100%'
    viewBox='0 0 512 512'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <g transform='translate(256, 256) scale(0.8) translate(-256, -256)'>
      <AppIcon color='black'>
        {(notification || presence) && (
          <Badge
            value={0}
            backgroundColor={presence ? PRESENCE_COLORS[presence] : 'black'}
          />
        )}
      </AppIcon>
    </g>
  </svg>
);

export default MacOSTrayIcon;
