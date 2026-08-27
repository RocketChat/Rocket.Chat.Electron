// The mask "cut" for a `PresenceBullet` overlay in `AppIcon`. A solid disc
// covering the full badge footprint — not the bullet's own shape — so that
// whatever the bullet does NOT paint (the away/busy cut-outs, the offline
// ring's hollow centre) masks out to the transparent tray background
// instead of letting the rocket glyph show through the hole. Matches
// Fuselage's status bullets, where cut-outs read as background, not glyph.
const PresenceBulletCutout = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
    <circle cx='47.5' cy='44.5' r='11.5' fill='black' />
  </svg>
);

export default PresenceBulletCutout;
