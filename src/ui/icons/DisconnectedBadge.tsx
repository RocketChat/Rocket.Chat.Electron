type DisconnectedBadgeProps = {
  backgroundColor?: string;
};

// Occupies the exact same footprint as `Badge` (viewBox `36 33 23 23`,
// circle centered at 47.5,44.5 with radius 11.5) so the disconnected mark
// sits where the presence dot/notification badge normally sits. Unlike
// `Badge`, the disc is hollow (a ring, not a filled circle) with a small
// warning tick inside it — a shape difference from every filled presence
// dot (including offline), not just a colour difference.
//
// The warning tick uses a saturated amber, not grey: `invertDarkAchromaticPixels`
// (macOSTrayGlyph.ts) only inverts low-saturation, low-luma pixels to keep
// the black rocket glyph legible in the menu bar. An achromatic mark here
// would get silently inverted along with the glyph; amber's saturation is
// far above the inversion threshold, so it always survives untouched.
//
// A pending notification badge takes the same slot on every other tray
// state, so while disconnected the fault indicator intentionally takes
// precedence over the unread count — the ring communicates "can't reach
// the server" regardless of how many messages are queued.
const DisconnectedBadge = ({
  backgroundColor = '#9EA2A8',
}: DisconnectedBadgeProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
    <circle
      cx='47.5'
      cy='44.5'
      r='9.5'
      fill='none'
      stroke={backgroundColor}
      strokeWidth='3'
    />
    <g fill='#FF9F1A'>
      <rect x='46.2' y='39.5' width='2.6' height='6.2' rx='1.3' />
      <circle cx='47.5' cy='48.3' r='1.5' />
    </g>
  </svg>
);

export default DisconnectedBadge;
