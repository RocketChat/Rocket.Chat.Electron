import type { AuthenticationDeepLink } from './AuthenticationDeepLink';
import type { InviteDeepLink } from './InviteDeepLink';
import type { OpenRoomDeepLink } from './OpenRoomDeepLink';

export type DeepLink =
  | AuthenticationDeepLink
  | OpenRoomDeepLink
  | InviteDeepLink;
