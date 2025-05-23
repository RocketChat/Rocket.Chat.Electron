import type { AnyAction } from 'redux';

import type { Download } from '../downloads/common';
import type { OutlookEventsResponse } from '../outlookCalendar/type';
import type { Server } from '../servers/common';
import type { SystemIdleState } from '../userPresence/common';

type ChannelToArgsMap = {
  'redux/get-initial-state': () => unknown;
  'redux/action-dispatched': (action: AnyAction) => void;
  'servers/fetch-info': (urlHref: string) => [urlHref: string, version: string];
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
  'certificatesManager/remove': (domain: string) => void;
  'server-view/get-url': () => Server['url'] | undefined;
  'server-view/ready': () => void;
  'server-view/open-url-on-browser': (url: string) => void;
  'video-call-window/open-window': (url: string) => void;
  'video-call-window/open-url': (url: string) => void;
  'video-call-window/web-contents-id': (webContentsId: number) => void;
  'video-call-window/open-screen-picker': () => void;
  'video-call-window/screen-sharing-source-responded': (source: string) => void;
  'video-call-window/screen-recording-is-permission-granted': () => boolean;
  'video-call-window/close-requested': () => void;
  'jitsi-desktop-capturer-get-sources': (
    args: [options: Electron.SourcesOptions, jitsiDomain: string]
  ) => Electron.DesktopCapturerSource[];
  'desktop-capturer-get-sources': (
    options: Electron.SourcesOptions
  ) => Electron.DesktopCapturerSource[];
  'outlook-calendar/get-events': (date: Date) => OutlookEventsResponse;
  'outlook-calendar/set-exchange-url': (url: string, userId: string) => void;
  'outlook-calendar/has-credentials': () => Promise<boolean>;
  'outlook-calendar/clear-credentials': () => void;
  'outlook-calendar/set-user-token': (token: string, userId: string) => void;
  'document-viewer/open-window': (
    url: string,
    format: string,
    options: any
  ) => void;
};

export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
