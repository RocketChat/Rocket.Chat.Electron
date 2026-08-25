// A solid disc in the rocket's neutral grey, same footprint as the presence
// bullets (viewBox `36 33 23 23`, circle centred at 47.5,44.5 radius 11.5).
//
// Windows has no taskbar-overlay-free "unread, presence unknown" state to
// distinguish visually from "unread, presence known" — unlike macOS, whose
// `notificationTemplate.png` is a template image and therefore always
// renders as a solid monochrome disc regardless of the badge value baked
// into it (AppKit flattens alpha to the menu-bar tint, discarding colour).
// This component makes Windows match that look instead of showing the
// legacy red badge, so the two platforms render identically for this state.
const NeutralBullet = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
    <circle cx='47.5' cy='44.5' r='11.5' fill='#9EA2A8' />
  </svg>
);

export default NeutralBullet;
