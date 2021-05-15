import type { Action, ActionCreator } from 'redux';

import type { DeepLinksActionTypeToPayloadMap } from './deepLinksActions';
import type { DownloadsActionTypeToPayloadMap } from './downloadsActions';
import type { NavigationActionTypeToPayloadMap } from './navigationActions';
import type { NotificationsActionTypeToPayloadMap } from './notificationsActions';
import type * as screenSharingActions from './screenSharingActions';
import type * as serverActions from './serverActions';
import type { SpellCheckingActionTypeToPayloadMap } from './spellCheckingActions';
import type { UiActionTypeToPayloadMap } from './uiActions';
import type * as updateActions from './updateActions';
import type * as updateCheckActions from './updateCheckActions';

type ActionTypeToPayloadMap = DeepLinksActionTypeToPayloadMap &
  DownloadsActionTypeToPayloadMap &
  NavigationActionTypeToPayloadMap &
  NotificationsActionTypeToPayloadMap &
  SpellCheckingActionTypeToPayloadMap &
  UiActionTypeToPayloadMap;

type ActionsFromModule<Module> = {
  [Field in keyof Module as Module[Field] extends ActionCreator<infer A>
    ? A extends Action<infer Type>
      ? Type
      : never
    : never]: Module[Field] extends ActionCreator<infer A> ? A : never;
};

export type RootActions = {
  [Type in keyof ActionTypeToPayloadMap]: void extends ActionTypeToPayloadMap[Type]
    ? {
        type: Type;
      }
    : {
        type: Type;
        payload: ActionTypeToPayloadMap[Type];
      };
} &
  ActionsFromModule<typeof screenSharingActions> &
  ActionsFromModule<typeof updateCheckActions> &
  ActionsFromModule<typeof updateActions> &
  ActionsFromModule<typeof serverActions>;

export type ActionOf<Type extends keyof RootActions> = RootActions[Type];
