type DisconnectedBadgeProps = {
  backgroundColor?: string;
};

// Occupies the exact same footprint as `Badge`/`PresenceBullet` (viewBox
// `36 33 23 23`, circle centered at 47.5,44.5 with radius 11.5) so the
// disconnected mark sits where the presence dot/notification badge
// normally sits.
//
// A filled amber disc with an exclamation mark cut out of it — not a
// hollow ring, so it stays legible at menu-bar/tray size. The mark is
// drawn with explicit geometry (not the thin Fuselage glyph, which reads
// too faint at tray size): a vertical rounded bar centred at x=47.5,
// 4.4 wide (~19% of the 23-unit diameter) spanning y 38.2-47.2 with fully
// rounded ends (rx=2.2), plus a dot of radius 2.3 (~20% of the diameter)
// centred at (47.5, 51.0).
//
// The cut-out is built via `<mask>` (white = visible, black = hidden) so
// it stays transparent — the tray background shows through, matching the
// away/busy presence bullet cut-outs — rather than being painted white,
// which would leave a solid mark instead of a hole.
const DisconnectedBadge = ({
  backgroundColor = '#F38C39',
}: DisconnectedBadgeProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
    <mask id='disconnected-cut'>
      <circle cx='47.5' cy='44.5' r='11.5' fill='white' />
      <rect x='45.3' y='38.2' width='4.4' height='9' rx='2.2' fill='black' />
      <circle cx='47.5' cy='51.0' r='2.3' fill='black' />
    </mask>
    <circle
      cx='47.5'
      cy='44.5'
      r='11.5'
      fill={backgroundColor}
      mask='url(#disconnected-cut)'
    />
  </svg>
);

export default DisconnectedBadge;
