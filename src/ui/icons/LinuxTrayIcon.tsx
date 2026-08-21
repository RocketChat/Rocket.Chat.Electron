import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import { PRESENCE_COLORS } from './presenceColors';

type LinuxTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
};

const LinuxTrayIcon = ({ badge, presence }: LinuxTrayIconProps) => (
  <AppIcon color='#9EA2A8'>
    {(badge || presence) && (
      <Badge
        value={badge ?? 0}
        backgroundColor={presence ? PRESENCE_COLORS[presence] : undefined}
      />
    )}
  </AppIcon>
);

export default LinuxTrayIcon;
