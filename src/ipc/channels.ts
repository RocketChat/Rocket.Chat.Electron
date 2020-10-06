import { AnyAction } from 'redux';

type ChannelToArgsMap = {
  'redux/get-initial-state': () => unknown;
  'redux/action-dispatched': (action: AnyAction) => void;
  'servers/fetch-info': (urlHref: string) => [urlHref: string, version: string];
};

export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
