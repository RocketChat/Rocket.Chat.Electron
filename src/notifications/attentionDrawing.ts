import { app } from 'electron';

import { select, Service } from '../store';
import { getRootWindow } from '../ui/main/rootWindow';

class AttentionDrawingService extends Service {
  private activeVoiceNotifications = new Set<string>();

  private bounceId: number | null = null;

  public async drawAttention(notificationId: string): Promise<void> {
    if (this.activeVoiceNotifications.has(notificationId)) {
      return;
    }

    const { isFlashFrameEnabled } = select(({ isFlashFrameEnabled }) => ({
      isFlashFrameEnabled,
    }));

    if (!isFlashFrameEnabled) {
      return;
    }

    try {
      const browserWindow = await getRootWindow();
      if (browserWindow.isDestroyed()) {
        return;
      }

      this.activeVoiceNotifications.add(notificationId);

      if (process.platform === 'darwin') {
        if (this.bounceId === null) {
          this.bounceId = app.dock?.bounce('critical') ?? null;
        }
      } else {
        browserWindow.flashFrame(true);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to draw attention:', error);
      }
    }
  }

  public async stopAttention(notificationId: string): Promise<void> {
    if (!this.activeVoiceNotifications.has(notificationId)) {
      return;
    }

    this.activeVoiceNotifications.delete(notificationId);

    if (this.activeVoiceNotifications.size > 0) {
      return;
    }

    if (process.platform === 'darwin' && this.bounceId !== null) {
      app.dock?.cancelBounce(this.bounceId);
      this.bounceId = null;
    }

    try {
      const browserWindow = await getRootWindow();
      if (browserWindow.isDestroyed()) {
        return;
      }

      if (process.platform !== 'darwin') {
        browserWindow.flashFrame(false);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to stop attention:', error);
      }
    }
  }

  protected destroy(): void {
    if (process.platform === 'darwin' && this.bounceId !== null) {
      app.dock?.cancelBounce(this.bounceId);
      this.bounceId = null;
    }
  }
}

export default new AttentionDrawingService();
