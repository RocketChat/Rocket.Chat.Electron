import type { AnyAction } from 'redux';

import type { Download } from '../common/types/Download';
import type { Server } from '../common/types/Server';
import type { ServerUrlResolutionResult } from '../common/types/ServerUrlResolutionResult';
import type { SystemIdleState } from '../common/types/SystemIdleState';

type ChannelToArgsMap = {
  'redux/get-initial-state': () => unknown;
  'redux/action-dispatched': (action: AnyAction) => void;
  'servers/resolve-url': (input: string) => ServerUrlResolutionResult;
  'notifications/fetch-icon': (urlHref: string) => string;
  'power-monitor/get-system-idle-state': (
    idleThreshold: number
  ) => SystemIdleState;
  'downloads/show-in-folder': (itemId: Download['itemId']) => void;
  'downloads/copy-link': (itemId: Download['itemId']) => void;
  'downloads/pause': (itemId: Download['itemId']) => void;
  'downloads/resume': (itemId: Download['itemId']) => void;
  'downloads/cancel': (itemId: Download['itemId']) => void;
  'downloads/retry': (itemId: Download['itemId']) => void;
  'downloads/remove': (itemId: Download['itemId']) => void;
  'server-view/get-url': () => Server['url'] | undefined;
  'server-view/ready': () => void;
};

export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
