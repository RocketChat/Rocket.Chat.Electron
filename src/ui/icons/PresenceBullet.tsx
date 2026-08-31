import type { UserPresence } from '../../servers/common';
import { PRESENCE_COLORS } from './presenceColors';

type PresenceBulletProps = {
  presence: UserPresence;
};

// Occupies the exact same footprint as `Badge` (viewBox `36 33 23 23`,
// circle centered at 47.5,44.5 with radius 11.5) so the presence bullet
// sits where the presence dot/notification badge normally sits.
//
// The away/busy paths are Fuselage's `StatusBullet` glyphs verbatim (10x10
// viewBox, evenodd fill rule cutting a clock hand / busy bar out of the
// filled circle), scaled 2.3x (23/10) and translated so the source glyph's
// centre (5.13337, 5.13337) lands on (47.5, 44.5). The cut-outs use
// `fillRule=evenodd` so they stay transparent — the tray background shows
// through, matching Fuselage's status bullets.
const AWAY_PATH =
  'M5.13337 9.93325C7.78434 9.93325 9.93338 7.78422 9.93338 5.13325C9.93338 2.48229 7.78434 0.333252 5.13337 0.333252C2.48241 0.333252 0.333374 2.48229 0.333374 5.13325C0.333374 7.78422 2.48241 9.93325 5.13337 9.93325ZM5.80004 2.33325C5.80004 1.96506 5.50156 1.66659 5.13337 1.66659C4.76518 1.66659 4.46671 1.96506 4.46671 2.33325V5.13325V5.45367L4.71691 5.65383L6.71691 7.25383C7.00442 7.48384 7.42395 7.43722 7.65395 7.14972C7.88396 6.86221 7.83735 6.44268 7.54984 6.21267L5.80004 4.81284V2.33325Z';

const BUSY_PATH =
  'M5.13337 9.93325C7.78434 9.93325 9.93338 7.78422 9.93338 5.13325C9.93338 2.48229 7.78434 0.333252 5.13337 0.333252C2.48241 0.333252 0.333374 2.48229 0.333374 5.13325C0.333374 7.78422 2.48241 9.93325 5.13337 9.93325ZM3.53338 4.46655C3.16519 4.46655 2.86671 4.76503 2.86671 5.13322C2.86671 5.50141 3.16519 5.79989 3.53338 5.79989H6.73338C7.10157 5.79989 7.40004 5.50141 7.40004 5.13322C7.40004 4.76503 7.10157 4.46655 6.73338 4.46655H3.53338Z';

const PresenceBullet = ({ presence }: PresenceBulletProps) => {
  const color = PRESENCE_COLORS[presence];

  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
      {presence === 'online' && (
        <circle cx='47.5' cy='44.5' r='11.5' fill={color} />
      )}
      {presence === 'offline' && (
        <circle
          cx='47.5'
          cy='44.5'
          r='9.5'
          fill='none'
          stroke={color}
          strokeWidth='4'
        />
      )}
      {(presence === 'away' || presence === 'busy') && (
        <g transform='translate(35.693, 32.693) scale(2.3)'>
          <path
            fillRule='evenodd'
            clipRule='evenodd'
            fill={color}
            d={presence === 'away' ? AWAY_PATH : BUSY_PATH}
          />
        </g>
      )}
    </svg>
  );
};

export default PresenceBullet;
