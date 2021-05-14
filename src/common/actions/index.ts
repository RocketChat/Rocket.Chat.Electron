import type { AppActionTypeToPayloadMap } from './appActions';
import type { DeepLinksActionTypeToPayloadMap } from './deepLinksActions';
import type { DownloadsActionTypeToPayloadMap } from './downloadsActions';
import type { NavigationActionTypeToPayloadMap } from './navigationActions';
import type { NotificationsActionTypeToPayloadMap } from './notificationsActions';
import type { ScreenSharingActionTypeToPayloadMap } from './screenSharingActions';
import type { ServersActionTypeToPayloadMap } from './serversActions';
import type { SpellCheckingActionTypeToPayloadMap } from './spellCheckingActions';
import type { UiActionTypeToPayloadMap } from './uiActions';
import type { UpdatesActionTypeToPayloadMap } from './updatesActions';
import type { UserPresenceActionTypeToPayloadMap } from './userPresenceActions';

type ActionTypeToPayloadMap = AppActionTypeToPayloadMap &
  DeepLinksActionTypeToPayloadMap &
  DownloadsActionTypeToPayloadMap &
  NavigationActionTypeToPayloadMap &
  NotificationsActionTypeToPayloadMap &
  ScreenSharingActionTypeToPayloadMap &
  ServersActionTypeToPayloadMap &
  SpellCheckingActionTypeToPayloadMap &
  UiActionTypeToPayloadMap &
  UpdatesActionTypeToPayloadMap &
  UserPresenceActionTypeToPayloadMap;

export type RootActions = {
  [Type in keyof ActionTypeToPayloadMap]: void extends ActionTypeToPayloadMap[Type]
    ? {
        type: Type;
      }
    : {
        type: Type;
        payload: ActionTypeToPayloadMap[Type];
      };
};

export type ActionOf<Type extends keyof RootActions> = RootActions[Type];
