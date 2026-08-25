import type { UserPresence } from '../../servers/common';
import { PRESENCE_COLORS } from './presenceColors';

type PresenceMenuIconProps = {
  presence: UserPresence;
};

// Same Fuselage glyphs/colours as `PresenceBullet`, with a viewBox that
// frames the bullet's own footprint (the circle centered at 47.5,44.5 with
// radius 11.5) plus a 1-unit margin on every side (`35 32 25 25` instead of
// the bullet's exact `36 33 23 23` box) so menu-icon renders keep a hairline
// of transparent padding instead of letting the ring/circle's antialiasing
// touch the edge of the rendered square. Tray/menu bar icon slots render
// whatever the viewBox contains at full size, so a viewBox padded to match
// a different UI element would shrink the bullet down to a speck here.
const PresenceMenuIcon = ({ presence }: PresenceMenuIconProps) => {
  const color = PRESENCE_COLORS[presence];

  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='35 32 25 25'>
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
            d={
              presence === 'away'
                ? 'M5.13337 9.93325C7.78434 9.93325 9.93338 7.78422 9.93338 5.13325C9.93338 2.48229 7.78434 0.333252 5.13337 0.333252C2.48241 0.333252 0.333374 2.48229 0.333374 5.13325C0.333374 7.78422 2.48241 9.93325 5.13337 9.93325ZM5.80004 2.33325C5.80004 1.96506 5.50156 1.66659 5.13337 1.66659C4.76518 1.66659 4.46671 1.96506 4.46671 2.33325V5.13325V5.45367L4.71691 5.65383L6.71691 7.25383C7.00442 7.48384 7.42395 7.43722 7.65395 7.14972C7.88396 6.86221 7.83735 6.44268 7.54984 6.21267L5.80004 4.81284V2.33325Z'
                : 'M5.13337 9.93325C7.78434 9.93325 9.93338 7.78422 9.93338 5.13325C9.93338 2.48229 7.78434 0.333252 5.13337 0.333252C2.48241 0.333252 0.333374 2.48229 0.333374 5.13325C0.333374 7.78422 2.48241 9.93325 5.13337 9.93325ZM3.53338 4.46655C3.16519 4.46655 2.86671 4.76503 2.86671 5.13322C2.86671 5.50141 3.16519 5.79989 3.53338 5.79989H6.73338C7.10157 5.79989 7.40004 5.50141 7.40004 5.13322C7.40004 4.76503 7.10157 4.46655 6.73338 4.46655H3.53338Z'
            }
          />
        </g>
      )}
    </svg>
  );
};

export default PresenceMenuIcon;
