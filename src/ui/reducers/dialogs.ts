import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { CLOSE_SERVER_INFO_MODAL, OPEN_SERVER_INFO_MODAL } from '../actions';

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

type DialogsState = {
  serverInfoModal: ServerInfoModalState;
};

type DialogsAction =
  | ActionOf<typeof OPEN_SERVER_INFO_MODAL>
  | ActionOf<typeof CLOSE_SERVER_INFO_MODAL>;

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

export const dialogs: Reducer<DialogsState, DialogsAction> = (
  state = {
    serverInfoModal: initialServerInfoModalState,
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

    default:
      return state;
  }
};
