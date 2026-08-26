import type { Server, UserPresence } from '../common';

// Presence does NOT live in the `Meteor.users` minimongo collection: the
// webapp keeps it in a standalone `Map` fed by the `stream-user-presence` DDP
// stream (`apps/meteor/client/lib/presence.ts`). Reading `Meteor.user().status`
// therefore always yielded `undefined`. This module holds the pure mapping
// from a presence-store entry plus the Meteor connection status to the payload
// `setUserPresence` expects, so the computation is unit-testable without a
// live webapp.

export type PresenceStoreEntry = {
  _id?: string;
  status?: string;
  statusText?: string;
};

export type PresenceSnapshot = {
  presence: Server['presence'];
  presenceStatusText: Server['presenceStatusText'];
  presenceConnection: Server['presenceConnection'];
  presenceSupported: Server['presenceSupported'];
};

const KNOWN_PRESENCE_VALUES: UserPresence[] = [
  'online',
  'away',
  'busy',
  'offline',
];

const CONNECTION_STATUS_MAP: Record<
  string,
  NonNullable<Server['presenceConnection']>
> = {
  connected: 'connected',
  connecting: 'connecting',
  waiting: 'connecting',
  failed: 'disconnected',
  offline: 'disconnected',
};

export const mapConnectionStatus = (
  status: string | undefined
): NonNullable<Server['presenceConnection']> =>
  status && Object.prototype.hasOwnProperty.call(CONNECTION_STATUS_MAP, status)
    ? CONNECTION_STATUS_MAP[status]
    : 'disconnected';

const normalizePresence = (
  status: string | undefined
): Server['presence'] | undefined =>
  KNOWN_PRESENCE_VALUES.find((value) => value === status);

// `supported` reflects whether the workspace exposes the presence module at
// all — NOT whether a status value happens to be present right now. Deriving
// it from the value is what hid the missing-presence bug: an absent status
// silently reported the whole feature as unsupported.
export const buildPresenceSnapshot = ({
  storeEntry,
  connectionStatus,
  supported,
}: {
  storeEntry?: PresenceStoreEntry | null;
  connectionStatus?: string;
  supported: boolean;
}): PresenceSnapshot => ({
  presence: supported ? normalizePresence(storeEntry?.status) : undefined,
  presenceStatusText: supported
    ? storeEntry?.statusText || undefined
    : undefined,
  presenceConnection: mapConnectionStatus(connectionStatus),
  presenceSupported: supported,
});
