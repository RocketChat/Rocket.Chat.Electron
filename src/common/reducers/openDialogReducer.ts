import type { Reducer } from 'redux';

import type { ActionOf } from '../actions';
import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../actions/navigationActions';
import * as screenSharingActions from '../actions/screenSharingActions';
import {
  ABOUT_DIALOG_DISMISSED,
  MENU_BAR_ABOUT_CLICKED,
  UPDATE_DIALOG_DISMISSED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
  UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
} from '../actions/uiActions';
import { UPDATES_NEW_VERSION_AVAILABLE } from '../actions/updatesActions';

type OpenDialogAction =
  | ActionOf<typeof ABOUT_DIALOG_DISMISSED>
  | ActionOf<typeof CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED>
  | ActionOf<typeof MENU_BAR_ABOUT_CLICKED>
  | ActionOf<typeof screenSharingActions.sourceDenied.type>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED>
  | ActionOf<typeof UPDATE_DIALOG_DISMISSED>
  | ActionOf<typeof UPDATE_DIALOG_INSTALL_BUTTON_CLICKED>
  | ActionOf<typeof UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED>
  | ActionOf<typeof UPDATE_DIALOG_SKIP_UPDATE_CLICKED>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof screenSharingActions.sourceRequested.type>
  | ActionOf<typeof screenSharingActions.sourceSelected.type>;

export const openDialog: Reducer<string | null, OpenDialogAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case MENU_BAR_ABOUT_CLICKED:
      return 'about';

    case screenSharingActions.sourceRequested.type:
      return 'screen-sharing';

    case UPDATES_NEW_VERSION_AVAILABLE:
      return 'update';

    case CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED:
      return 'select-client-certificate';

    case ABOUT_DIALOG_DISMISSED:
    case screenSharingActions.sourceSelected.type:
    case screenSharingActions.sourceDenied.type:
    case SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED:
    case SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED:
    case UPDATE_DIALOG_DISMISSED:
    case UPDATE_DIALOG_SKIP_UPDATE_CLICKED:
    case UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED:
    case UPDATE_DIALOG_INSTALL_BUTTON_CLICKED:
      return null;

    default:
      return state;
  }
};
