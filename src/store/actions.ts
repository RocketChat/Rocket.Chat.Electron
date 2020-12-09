import { AppActionTypeToPayloadMap } from '../app/actions';
import { DeepLinksActionTypeToPayloadMap } from '../deepLinks/actions';
import { DownloadsActionTypeToPayloadMap } from '../downloads/actions';
import { I18nActionTypeToPayloadMap } from '../i18n/actions';
import { NavigationActionTypeToPayloadMap } from '../navigation/actions';
import { NotificationsActionTypeToPayloadMap } from '../notifications/actions';
import { ScreenSharingActionTypeToPayloadMap } from '../screenSharing/actions';
import { ServersActionTypeToPayloadMap } from '../servers/actions';
import { SpellCheckingActionTypeToPayloadMap } from '../spellChecking/actions';
import { UiActionTypeToPayloadMap } from '../ui/actions';
import { UpdatesActionTypeToPayloadMap } from '../updates/actions';
import { UserPresenceActionTypeToPayloadMap } from '../userPresence/actions';
import { FluxStandardAction } from './fsa';

type ActionTypeToPayloadMap = (
  AppActionTypeToPayloadMap
  & DeepLinksActionTypeToPayloadMap
  & DownloadsActionTypeToPayloadMap
  & I18nActionTypeToPayloadMap
  & NavigationActionTypeToPayloadMap
  & NotificationsActionTypeToPayloadMap
  & ScreenSharingActionTypeToPayloadMap
  & ServersActionTypeToPayloadMap
  & SpellCheckingActionTypeToPayloadMap
  & UiActionTypeToPayloadMap
  & UpdatesActionTypeToPayloadMap
  & UserPresenceActionTypeToPayloadMap
);

export type ActionOf<T extends keyof ActionTypeToPayloadMap> = FluxStandardAction<T, ActionTypeToPayloadMap[T]>;

export type RootAction = ActionOf<keyof ActionTypeToPayloadMap>;
