import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import {
  CLOSE_SERVER_INFO_MODAL,
  OPEN_SERVER_INFO_MODAL,
  TELEPHONY_SERVER_SELECT_OPEN,
  TELEPHONY_SERVER_SELECT_CLOSE,
} from '../actions';

type ServerInfoModalState = {
  isOpen: boolean;
  serverData: {
    url: string;
    version?: string;
    exchangeUrl?: string;
    isSupportedVersion?: boolean;
    supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
    supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
    supportedVersions?: any; // SupportedVersions type
  } | null;
};

type TelephonyServerSelectState = {
  isOpen: boolean;
  phoneNumber: string;
  rawUri: string;
} | null;

type DialogsState = {
  serverInfoModal: ServerInfoModalState;
  telephonyServerSelect: TelephonyServerSelectState;
};

type DialogsAction =
  | ActionOf<typeof OPEN_SERVER_INFO_MODAL>
  | ActionOf<typeof CLOSE_SERVER_INFO_MODAL>
  | ActionOf<typeof TELEPHONY_SERVER_SELECT_OPEN>
  | ActionOf<typeof TELEPHONY_SERVER_SELECT_CLOSE>;

const initialServerInfoModalState: ServerInfoModalState = {
  isOpen: false,
  serverData: null,
};

const serverInfoModal: Reducer<ServerInfoModalState, DialogsAction> = (
  state = initialServerInfoModalState,
  action
) => {
  switch (action.type) {
    case OPEN_SERVER_INFO_MODAL:
      return {
        isOpen: true,
        serverData: action.payload,
      };

    case CLOSE_SERVER_INFO_MODAL:
      return initialServerInfoModalState;

    default:
      return state;
  }
};

const telephonyServerSelect: Reducer<
  TelephonyServerSelectState,
  DialogsAction
> = (state = null, action) => {
  switch (action.type) {
    case TELEPHONY_SERVER_SELECT_OPEN:
      return {
        isOpen: true,
        phoneNumber: action.payload.phoneNumber,
        rawUri: action.payload.rawUri,
      };

    case TELEPHONY_SERVER_SELECT_CLOSE:
      return null;

    default:
      return state;
  }
};

export const dialogs: Reducer<DialogsState, DialogsAction> = (
  state = {
    serverInfoModal: initialServerInfoModalState,
    telephonyServerSelect: null,
  },
  action
) => {
  switch (action.type) {
    case OPEN_SERVER_INFO_MODAL:
    case CLOSE_SERVER_INFO_MODAL:
      return {
        ...state,
        serverInfoModal: serverInfoModal(state.serverInfoModal, action),
      };

    case TELEPHONY_SERVER_SELECT_OPEN:
    case TELEPHONY_SERVER_SELECT_CLOSE:
      return {
        ...state,
        telephonyServerSelect: telephonyServerSelect(
          state.telephonyServerSelect,
          action
        ),
      };

    default:
      return state;
  }
};
