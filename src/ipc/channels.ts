import { AnyAction } from 'redux';

import { Download } from '../downloads/common';
import { Server } from '../servers/common';
import { SystemIdleState } from '../userPresence/common';

type ChannelToArgsMap = {
  'redux/get-initial-state': () => unknown;
  'redux/action-dispatched': (action: AnyAction) => void;
  'servers/fetch-info': (urlHref: string) => [urlHref: string, version: string];
  'notifications/fetch-icon': (urlHref: string) => string;
  'power-monitor/get-system-idle-state': (idleThreshold: number) => SystemIdleState;
  'downloads/show-in-folder': (itemId: Download['itemId']) => void;
  'downloads/copy-link': (itemId: Download['itemId']) => void;
  'downloads/pause': (itemId: Download['itemId']) => void;
  'downloads/resume': (itemId: Download['itemId']) => void;
  'downloads/cancel': (itemId: Download['itemId']) => void;
  'downloads/retry': (itemId: Download['itemId']) => void;
  'downloads/remove': (itemId: Download['itemId']) => void;
  'server-view/get-url': () => Server['url'];
  'server-view/ready': () => void;
};

export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
