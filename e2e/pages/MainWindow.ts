import type { Page } from '@playwright/test';

export class MainWindow {
  constructor(private page: Page) {}

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async isVisible(): Promise<boolean> {
    return this.page.locator('body').isVisible();
  }

  async clickAddServer(): Promise<void> {
    const addButton = this.page.locator('button:has-text("Add new server"), button:has-text("Add")').first();
    await addButton.click();
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `e2e/test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async pressKeyboardShortcut(shortcut: string): Promise<void> {
    await this.page.keyboard.press(shortcut);
  }

  async hasElement(selector: string, timeout = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getElementCount(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  async resize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }
}
