import type { Server, UserPresence } from '../../servers/common';
import AppIcon from './AppIcon';
import Badge from './Badge';
import DisconnectedBadge from './DisconnectedBadge';
import { PRESENCE_COLORS } from './presenceColors';

type WindowsTrayIconProps = {
  badge?: Server['badge'];
  presence?: UserPresence;
  disconnected?: boolean;
};

const WindowsTrayIcon = ({
  badge,
  presence,
  disconnected,
}: WindowsTrayIconProps) => (
  <AppIcon color='#9EA2A8'>
    {disconnected ? (
      <DisconnectedBadge />
    ) : (
      (badge || presence) && (
        <Badge
          value={badge ?? 0}
          backgroundColor={presence ? PRESENCE_COLORS[presence] : undefined}
        />
      )
    )}
  </AppIcon>
);

export default WindowsTrayIcon;
