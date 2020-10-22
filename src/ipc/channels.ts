import { AnyAction } from 'redux';

import { SystemIdleState } from '../userPresence/common';

type ChannelToArgsMap = {
  'redux/get-initial-state': () => unknown;
  'redux/action-dispatched': (action: AnyAction) => void;
  'servers/fetch-info': (urlHref: string) => [urlHref: string, version: string];
  'notifications/fetch-icon': (urlHref: string) => string;
  'power-monitor/get-system-idle-state': (idleThreshold: number) => SystemIdleState;
};

export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
