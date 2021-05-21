import type { AnyAction } from 'redux';

import type { Server } from '../common/types/Server';
import type { ServerUrlResolutionResult } from '../common/types/ServerUrlResolutionResult';

type ChannelToArgsMap = {
  'redux/get-initial-state': () => unknown;
  'redux/action-dispatched': (action: AnyAction) => void;
  'servers/resolve-url': (input: string) => ServerUrlResolutionResult;
  'server-view/get-url': () => Server['url'] | undefined;
  'server-view/ready': () => void;
};

export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
