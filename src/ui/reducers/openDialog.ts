import type { Reducer } from 'redux';

import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../../navigation/actions';
import {
  OUTLOOK_CALENDAR_DIALOG_DISMISSED,
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
} from '../../outlookCalendar/actions';
import { SCREEN_SHARING_DIALOG_DISMISSED } from '../../screenSharing/actions';
import type { ActionOf } from '../../store/actions';
import type { SUPPORTED_VERSION_DIALOG_DISMISS } from '../actions';
import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../actions';

type OpenDialogAction =
  | ActionOf<typeof CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED>
  | ActionOf<typeof SCREEN_SHARING_DIALOG_DISMISSED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED>
  | ActionOf<typeof SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED>
  | ActionOf<typeof WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED>
  | ActionOf<typeof WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED>
  | ActionOf<typeof OUTLOOK_CALENDAR_ASK_CREDENTIALS>
  | ActionOf<typeof OUTLOOK_CALENDAR_DIALOG_DISMISSED>
  | ActionOf<typeof OUTLOOK_CALENDAR_SET_CREDENTIALS>
  | ActionOf<typeof SUPPORTED_VERSION_DIALOG_DISMISS>;

export const openDialog: Reducer<string | null, OpenDialogAction> = (
  state = null,
  action
) => {
  switch (action.type) {
    case WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED:
      return 'screen-sharing';

    case CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED:
      return 'select-client-certificate';

    case OUTLOOK_CALENDAR_ASK_CREDENTIALS:
      return 'outlook-credentials';

    case SCREEN_SHARING_DIALOG_DISMISSED:
    case WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED:
    case SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED:
    case SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED:
    case OUTLOOK_CALENDAR_DIALOG_DISMISSED:
    case OUTLOOK_CALENDAR_SET_CREDENTIALS:
      return null;

    default:
      return state;
  }
};
