import type { UserPresence } from '../../servers/common';

export const PRESENCE_COLORS: Record<UserPresence, string> = {
  online: '#2DE0A5',
  away: '#FFD21F',
  busy: '#F5455C',
  offline: '#9EA2A8',
};
