import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MemoryFeature } from '../MemoryFeature';
import { createMockWebContents } from './setup';

// Create a concrete implementation for testing
class TestMemoryFeature extends MemoryFeature {
  public onEnableCalled = false;
  public onDisableCalled = false;
  public onApplyToWebContentsCalled = false;
  public onSystemSleepCalled = false;
  public onSystemResumeCalled = false;

  getName(): string {
    return 'TestFeature';
  }

  protected async onEnable(): Promise<void> {
    this.onEnableCalled = true;
  }

  protected async onDisable(): Promise<void> {
    this.onDisableCalled = true;
  }

  protected async onApplyToWebContents(): Promise<void> {
    this.onApplyToWebContentsCalled = true;
  }

  protected async onSystemSleep(): Promise<void> {
    this.onSystemSleepCalled = true;
  }

  protected async onSystemResume(): Promise<void> {
    this.onSystemResumeCalled = true;
  }

  // Expose protected method for testing
  public testAddMemorySaved(bytes: number): void {
    this.addMemorySaved(bytes);
  }
}

describe('MemoryFeature', () => {
  let feature: TestMemoryFeature;

  beforeEach(() => {
    feature = new TestMemoryFeature();
  });

  describe('lifecycle', () => {
    it('should initialize with disabled state', () => {
      expect(feature.isEnabled()).toBe(false);
    });

    it('should enable feature correctly', async () => {
      await feature.enable();
      
      expect(feature.isEnabled()).toBe(true);
      expect(feature.onEnableCalled).toBe(true);
    });

    it('should not enable if already enabled', async () => {
      await feature.enable();
      feature.onEnableCalled = false;
      
      await feature.enable();
      
      expect(feature.onEnableCalled).toBe(false);
    });

    it('should disable feature correctly', async () => {
      await feature.enable();
      await feature.disable();
      
      expect(feature.isEnabled()).toBe(false);
      expect(feature.onDisableCalled).toBe(true);
    });

    it('should not disable if already disabled', async () => {
      await feature.disable();
      
      expect(feature.onDisableCalled).toBe(false);
    });
  });

  describe('metrics', () => {
    it('should initialize metrics with zero values', () => {
      const metrics = feature.getMetrics();
      
      expect(metrics.activations).toBe(0);
      expect(metrics.memorySaved).toBe(0);
      expect(metrics.lastRun).toBe(0);
    });

    it('should track memory saved', () => {
      feature.testAddMemorySaved(1024);
      feature.testAddMemorySaved(2048);
      
      const metrics = feature.getMetrics();
      expect(metrics.memorySaved).toBe(3072);
    });

    it('should return a copy of metrics', () => {
      const metrics1 = feature.getMetrics();
      metrics1.activations = 100;
      
      const metrics2 = feature.getMetrics();
      expect(metrics2.activations).toBe(0);
    });
  });

  describe('webContents integration', () => {
    it('should apply to webContents when enabled', async () => {
      const mockWebContents = createMockWebContents();
      await feature.enable();
      
      await feature.applyToWebContents(mockWebContents, 'https://example.com');
      
      expect(feature.onApplyToWebContentsCalled).toBe(true);
    });

    it('should not apply to webContents when disabled', async () => {
      const mockWebContents = createMockWebContents();
      
      await feature.applyToWebContents(mockWebContents, 'https://example.com');
      
      expect(feature.onApplyToWebContentsCalled).toBe(false);
    });
  });

  describe('system events', () => {
    beforeEach(async () => {
      await feature.enable();
    });

    it('should handle system sleep when enabled', async () => {
      await feature.handleSystemSleep();
      
      expect(feature.onSystemSleepCalled).toBe(true);
    });

    it('should not handle system sleep when disabled', async () => {
      await feature.disable();
      await feature.handleSystemSleep();
      
      expect(feature.onSystemSleepCalled).toBe(false);
    });

    it('should handle system resume and update metrics', async () => {
      const timeBefore = Date.now();
      await feature.handleSystemResume();
      
      expect(feature.onSystemResumeCalled).toBe(true);
      
      const metrics = feature.getMetrics();
      expect(metrics.activations).toBe(1);
      expect(metrics.lastRun).toBeGreaterThanOrEqual(timeBefore);
    });

    it('should not handle system resume when disabled', async () => {
      await feature.disable();
      await feature.handleSystemResume();
      
      expect(feature.onSystemResumeCalled).toBe(false);
      
      const metrics = feature.getMetrics();
      expect(metrics.activations).toBe(0);
    });
  });

  describe('feature identification', () => {
    it('should return correct feature name', () => {
      expect(feature.getName()).toBe('TestFeature');
    });
  });
});