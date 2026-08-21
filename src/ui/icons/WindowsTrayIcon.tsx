import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import { PRESENCE_COLORS } from './presenceColors';

type WindowsTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
};

const WindowsTrayIcon = ({ badge, presence }: WindowsTrayIconProps) => (
  <AppIcon color='#9EA2A8'>
    {(badge || presence) && (
      <Badge
        value={badge ?? 0}
        backgroundColor={presence ? PRESENCE_COLORS[presence] : undefined}
      />
    )}
  </AppIcon>
);

export default WindowsTrayIcon;
