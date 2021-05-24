import type { Action, ActionCreator } from 'redux';

import type * as certificateActions from './certificateActions';
import type * as certificatesActions from './certificatesActions';
import type * as clientCertificateActions from './clientCertificateActions';
import type * as deepLinksActions from './deepLinksActions';
import type * as dialogActions from './dialogActions';
import type * as downloadActions from './downloadActions';
import type * as externalProtocolActions from './externalProtocolActions';
import type * as menuBarActions from './menuBarActions';
import type * as messageBoxActions from './messageBoxActions';
import type * as notificationActions from './notificationActions';
import type * as rootWindowActions from './rootWindowActions';
import type * as screenSharingActions from './screenSharingActions';
import type * as serverActions from './serverActions';
import type * as serversActions from './serversActions';
import type * as sideBarActions from './sideBarActions';
import type * as spellCheckingActions from './spellCheckingActions';
import type * as trayIconActions from './trayIconActions';
import type * as updateActions from './updateActions';
import type * as updateCheckActions from './updateCheckActions';
import type * as viewActions from './viewActions';

type ActionsFromModule<Module> = {
  [Field in keyof Module as Module[Field] extends ActionCreator<infer A>
    ? A extends Action<infer Type>
      ? Type
      : never
    : never]: Module[Field] extends ActionCreator<infer A> ? A : never;
};

export type RootActions = ActionsFromModule<typeof certificateActions> &
  ActionsFromModule<typeof certificatesActions> &
  ActionsFromModule<typeof clientCertificateActions> &
  ActionsFromModule<typeof deepLinksActions> &
  ActionsFromModule<typeof dialogActions> &
  ActionsFromModule<typeof downloadActions> &
  ActionsFromModule<typeof externalProtocolActions> &
  ActionsFromModule<typeof menuBarActions> &
  ActionsFromModule<typeof messageBoxActions> &
  ActionsFromModule<typeof notificationActions> &
  ActionsFromModule<typeof rootWindowActions> &
  ActionsFromModule<typeof screenSharingActions> &
  ActionsFromModule<typeof serverActions> &
  ActionsFromModule<typeof serversActions> &
  ActionsFromModule<typeof sideBarActions> &
  ActionsFromModule<typeof spellCheckingActions> &
  ActionsFromModule<typeof trayIconActions> &
  ActionsFromModule<typeof updateActions> &
  ActionsFromModule<typeof updateCheckActions> &
  ActionsFromModule<typeof viewActions>;
