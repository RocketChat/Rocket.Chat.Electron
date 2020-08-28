import { satisfies, coerce } from 'semver';

import { listenToBadgeChanges } from './badge';
import { listenToFaviconChanges } from './favicon';
import { listenToSideBarChanges } from './sidebar';
import { listenToTitleChanges } from './title';

export const isRocketChat = (): boolean => {
  if (typeof window.require !== 'function') {
    return false;
  }

  try {
    const { Info } = window.require('/app/utils/rocketchat.info');
    return satisfies(coerce(Info.version), '>=3.0.x');
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const setupRocketChatPage = (): void => {
  listenToBadgeChanges();
  listenToFaviconChanges();
  listenToSideBarChanges();
  listenToTitleChanges();
};
