import { app } from 'electron';

import { eventEmitterChannel } from '.';

export const appActivateEvent = eventEmitterChannel(app, 'activate');
export const appBeforeQuitEvent = eventEmitterChannel(app, 'before-quit');
export const appSecondInstanceEvent = eventEmitterChannel(app, 'second-instance');
