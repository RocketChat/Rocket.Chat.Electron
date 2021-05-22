import type { Action, ActionCreator } from 'redux';

import type * as deepLinksActions from './deepLinksActions';
import type * as downloadActions from './downloadActions';
import type { NavigationActionTypeToPayloadMap } from './navigationActions';
import type * as notificationActions from './notificationActions';
import type * as rootWindowActions from './rootWindowActions';
import type * as screenSharingActions from './screenSharingActions';
import type * as serverActions from './serverActions';
import type * as serversActions from './serversActions';
import type * as spellCheckingActions from './spellCheckingActions';
import type { UiActionTypeToPayloadMap } from './uiActions';
import type * as updateActions from './updateActions';
import type * as updateCheckActions from './updateCheckActions';
import type * as viewActions from './viewActions';

type ActionTypeToPayloadMap = NavigationActionTypeToPayloadMap &
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
  ActionsFromModule<typeof deepLinksActions> &
  ActionsFromModule<typeof downloadActions> &
  ActionsFromModule<typeof notificationActions> &
  ActionsFromModule<typeof rootWindowActions> &
  ActionsFromModule<typeof screenSharingActions> &
  ActionsFromModule<typeof serverActions> &
  ActionsFromModule<typeof serversActions> &
  ActionsFromModule<typeof spellCheckingActions> &
  ActionsFromModule<typeof updateActions> &
  ActionsFromModule<typeof updateCheckActions> &
  ActionsFromModule<typeof viewActions>;

export type ActionOf<Type extends keyof RootActions> = RootActions[Type];
