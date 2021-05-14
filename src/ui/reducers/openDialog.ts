import type { Reducer } from 'redux';

import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../../navigation/actions';
import { SCREEN_SHARING_DIALOG_DISMISSED } from '../../screenSharing/actions';
import type { ActionOf } from '../../store/actions';
import { UPDATES_NEW_VERSION_AVAILABLE } from '../../updates/actions';
import {
  ABOUT_DIALOG_DISMISSED,
  MENU_BAR_ABOUT_CLICKED,
  UPDATE_DIALOG_DISMISSED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
  UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../actions';

type OpenDialogAction =
  | ActionOf<typeof ABOUT_DIALOG_DISMISSED>
  | ActionOf<typeof CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED>
  | ActionOf<typeof MENU_BAR_ABOUT_CLICKED>
  | ActionOf<typeof SCREEN_SHARING_DIALOG_DISMISSED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED>
  | ActionOf<typeof UPDATE_DIALOG_DISMISSED>
  | ActionOf<typeof UPDATE_DIALOG_INSTALL_BUTTON_CLICKED>
  | ActionOf<typeof UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED>
  | ActionOf<typeof UPDATE_DIALOG_SKIP_UPDATE_CLICKED>
  | ActionOf<typeof UPDATES_NEW_VERSION_AVAILABLE>
  | ActionOf<typeof WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED>
  | ActionOf<typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED>;

export const openDialog: Reducer<string | null, OpenDialogAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case MENU_BAR_ABOUT_CLICKED:
      return 'about';

    case WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED:
      return 'screen-sharing';

    case UPDATES_NEW_VERSION_AVAILABLE:
      return 'update';

    case CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED:
      return 'select-client-certificate';

    case ABOUT_DIALOG_DISMISSED:
    case SCREEN_SHARING_DIALOG_DISMISSED:
    case WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED:
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
