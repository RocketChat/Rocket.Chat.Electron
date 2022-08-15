import { app } from 'electron';

import { select, Service } from '../../store';
import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../selectors';

class DockService extends Service {
  protected initialize(): void {
    if (process.platform !== 'darwin') {
      return;
    }

    this.watch(selectGlobalBadgeText, (globalBadgeText) => {
      app.dock.setBadge(globalBadgeText);
    });

    this.watch(
      selectGlobalBadgeCount,
      (globalBadgeCount, prevGlobalBadgeCount) => {
        const { isFlashFrameEnabled } = select(({ isFlashFrameEnabled }) => ({
          isFlashFrameEnabled,
        }));

        if (globalBadgeCount <= 0 || (prevGlobalBadgeCount ?? 0) > 0) {
          return;
        }

        if (isFlashFrameEnabled) {
          app.dock.bounce();
        }
      }
    );
  }
}

export default new DockService();
