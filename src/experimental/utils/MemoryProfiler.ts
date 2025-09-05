import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

import type { WebContents } from 'electron';
import { app, webContents, session } from 'electron';

export interface HeapSnapshot {
  timestamp: number;
  pid: number;
  type: 'main' | 'renderer';
  size: number;
  path?: string;
  summary?: {
    totalSize: number;
    totalObjects: number;
    jsArrays: number;
    strings: number;
    systems: number;
    compiled: number;
    closures: number;
  };
}

export interface MemoryProfile {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  snapshots: HeapSnapshot[];
  allocations: AllocationProfile[];
  leaks: DetectedLeak[];
  summary: ProfileSummary;
}

export interface AllocationProfile {
  timestamp: number;
  allocations: number;
  deallocations: number;
  netAllocations: number;
  largestAllocation: number;
  fragmentationRatio: number;
}

export interface DetectedLeak {
  type:
    | 'DOM'
    | 'EventListener'
    | 'Timer'
    | 'Promise'
    | 'Closure'
    | 'DetachedNode';
  severity: 'low' | 'medium' | 'high';
  size: number;
  count: number;
  location?: string;
  stackTrace?: string[];
  recommendation: string;
}

export interface ProfileSummary {
  initialMemory: number;
  finalMemory: number;
  peakMemory: number;
  averageMemory: number;
  memoryGrowth: number;
  gcCollections: number;
  leaksDetected: number;
  fragmentationLevel: number;
  recommendation: string;
}

export interface ProfileOptions {
  duration?: number; // milliseconds
  interval?: number; // milliseconds
  includeSnapshots?: boolean;
  includeSampling?: boolean;
  webContentsId?: number;
  outputPath?: string;
}

/**
 * Memory Profiler utility for deep memory analysis and debugging.
 * Provides heap snapshots, allocation tracking, and leak detection.
 */
export class MemoryProfiler {
  private static activeProfiles = new Map<string, ProfileSession>();

  private static profileCounter = 0;

  /**
   * Start a memory profiling session
   */
  static async startProfiling(options: ProfileOptions = {}): Promise<string> {
    const profileId = `profile-${Date.now()}-${++this.profileCounter}`;
    const session = new ProfileSession(profileId, options);

    this.activeProfiles.set(profileId, session);
    await session.start();

    return profileId;
  }

  /**
   * Stop a profiling session and get results
   */
  static async stopProfiling(profileId: string): Promise<MemoryProfile> {
    const session = this.activeProfiles.get(profileId);
    if (!session) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const profile = await session.stop();
    this.activeProfiles.delete(profileId);

    return profile;
  }

  /**
   * Take a heap snapshot
   */
  static async takeHeapSnapshot(
    targetWebContents?: WebContents
  ): Promise<HeapSnapshot> {
    const timestamp = Date.now();

    if (targetWebContents) {
      return this.takeRendererSnapshot(targetWebContents, timestamp);
    }
    return this.takeMainSnapshot(timestamp);
  }

  private static async takeMainSnapshot(
    timestamp: number
  ): Promise<HeapSnapshot> {
    const v8 = require('v8');
    const snapshotPath = path.join(
      app.getPath('temp'),
      `heap-main-${timestamp}.heapsnapshot`
    );

    // Take snapshot
    const snapshotStream = v8.getHeapSnapshot();
    const chunks: Buffer[] = [];

    for await (const chunk of snapshotStream) {
      chunks.push(chunk);
    }

    const snapshotData = Buffer.concat(chunks);
    await fs.writeFile(snapshotPath, snapshotData);

    // Parse summary
    const summary = this.parseSnapshotSummary(snapshotData.toString());

    return {
      timestamp,
      pid: process.pid,
      type: 'main',
      size: snapshotData.length,
      path: snapshotPath,
      summary,
    };
  }

  private static async takeRendererSnapshot(
    wc: WebContents,
    timestamp: number
  ): Promise<HeapSnapshot> {
    if (wc.isDestroyed()) {
      throw new Error('WebContents is destroyed');
    }

    // Get process memory info
    const metrics = app.getAppMetrics();
    const processMetric = metrics.find(
      (m) => (m as any).webContents?.id === wc.id
    );

    if (!processMetric) {
      throw new Error('Could not find process for WebContents');
    }

    // Execute JavaScript to get heap info
    const heapInfo = await wc.executeJavaScript(`
      (() => {
        const info = performance.memory || {};
        return {
          totalSize: info.totalJSHeapSize || 0,
          usedSize: info.usedJSHeapSize || 0,
          limit: info.jsHeapSizeLimit || 0
        };
      })()
    `);

    return {
      timestamp,
      pid: processMetric.pid,
      type: 'renderer',
      size: heapInfo.usedSize,
      summary: {
        totalSize: heapInfo.totalSize,
        totalObjects: 0, // Would need actual parsing
        jsArrays: 0,
        strings: 0,
        systems: 0,
        compiled: 0,
        closures: 0,
      },
    };
  }

  private static parseSnapshotSummary(
    snapshotData: string
  ): HeapSnapshot['summary'] {
    // Simplified parsing - real implementation would parse the V8 heap snapshot format
    try {
      const snapshot = JSON.parse(snapshotData);
      return {
        totalSize: snapshot.snapshot?.meta?.node_count || 0,
        totalObjects: snapshot.snapshot?.node_count || 0,
        jsArrays: 0,
        strings: 0,
        systems: 0,
        compiled: 0,
        closures: 0,
      };
    } catch {
      return {
        totalSize: snapshotData.length,
        totalObjects: 0,
        jsArrays: 0,
        strings: 0,
        systems: 0,
        compiled: 0,
        closures: 0,
      };
    }
  }

  /**
   * Analyze memory allocations
   */
  static async analyzeAllocations(
    duration: number = 10000
  ): Promise<AllocationProfile[]> {
    const profiles: AllocationProfile[] = [];
    const startTime = Date.now();
    const interval = 1000;

    const initialMemory = process.memoryUsage();
    let previousMemory = initialMemory;

    const collectInterval = setInterval(() => {
      const currentMemory = process.memoryUsage();
      const allocations = Math.max(
        0,
        currentMemory.heapUsed - previousMemory.heapUsed
      );
      const deallocations = Math.max(
        0,
        previousMemory.heapUsed - currentMemory.heapUsed
      );

      profiles.push({
        timestamp: Date.now(),
        allocations,
        deallocations,
        netAllocations: allocations - deallocations,
        largestAllocation: Math.max(allocations, deallocations),
        fragmentationRatio: currentMemory.external / currentMemory.heapTotal,
      });

      previousMemory = currentMemory;
    }, interval);

    await new Promise((resolve) => setTimeout(resolve, duration));
    clearInterval(collectInterval);

    return profiles;
  }

  /**
   * Detect memory leaks
   */
  static async detectLeaks(webContentsId?: number): Promise<DetectedLeak[]> {
    const leaks: DetectedLeak[] = [];

    if (webContentsId) {
      const wc = webContents.fromId(webContentsId);
      if (wc && !wc.isDestroyed()) {
        const domLeaks = await this.detectDOMLeaks(wc);
        const listenerLeaks = await this.detectEventListenerLeaks(wc);
        leaks.push(...domLeaks, ...listenerLeaks);
      }
    }

    // Detect timer leaks in main process
    const timerLeaks = this.detectTimerLeaks();
    leaks.push(...timerLeaks);

    return leaks;
  }

  private static async detectDOMLeaks(
    wc: WebContents
  ): Promise<DetectedLeak[]> {
    const leaks: DetectedLeak[] = [];

    try {
      const domInfo = await wc.executeJavaScript(`
        (() => {
          const detached = [];
          const all = document.querySelectorAll('*');
          
          // Find detached nodes (simplified)
          for (const node of all) {
            if (!document.body.contains(node) && node !== document.documentElement) {
              detached.push(node.tagName);
            }
          }
          
          return {
            totalNodes: all.length,
            detachedCount: detached.length,
            detachedTypes: [...new Set(detached)]
          };
        })()
      `);

      if (domInfo.detachedCount > 100) {
        leaks.push({
          type: 'DetachedNode',
          severity: domInfo.detachedCount > 1000 ? 'high' : 'medium',
          size: domInfo.detachedCount * 100, // Estimated bytes per node
          count: domInfo.detachedCount,
          location: wc.getURL(),
          recommendation: 'Remove references to detached DOM nodes',
        });
      }

      if (domInfo.totalNodes > 10000) {
        leaks.push({
          type: 'DOM',
          severity: domInfo.totalNodes > 50000 ? 'high' : 'medium',
          size: domInfo.totalNodes * 100,
          count: domInfo.totalNodes,
          location: wc.getURL(),
          recommendation:
            'Reduce DOM node count or implement virtual scrolling',
        });
      }
    } catch (error) {
      // Ignore errors
    }

    return leaks;
  }

  private static async detectEventListenerLeaks(
    wc: WebContents
  ): Promise<DetectedLeak[]> {
    const leaks: DetectedLeak[] = [];

    try {
      const listenerInfo = await wc.executeJavaScript(`
        (() => {
          let totalListeners = 0;
          const elements = document.querySelectorAll('*');
          
          // Count listeners (simplified - would need getEventListeners in real impl)
          for (const el of elements) {
            // Estimate based on common events
            ['click', 'scroll', 'resize', 'keydown', 'keyup'].forEach(event => {
              if (el['on' + event]) totalListeners++;
            });
          }
          
          return {
            totalListeners,
            elementsWithListeners: Math.floor(totalListeners / 5)
          };
        })()
      `);

      if (listenerInfo.totalListeners > 1000) {
        leaks.push({
          type: 'EventListener',
          severity: listenerInfo.totalListeners > 5000 ? 'high' : 'medium',
          size: listenerInfo.totalListeners * 50,
          count: listenerInfo.totalListeners,
          location: wc.getURL(),
          recommendation: 'Remove event listeners when components unmount',
        });
      }
    } catch (error) {
      // Ignore errors
    }

    return leaks;
  }

  private static detectTimerLeaks(): DetectedLeak[] {
    const leaks: DetectedLeak[] = [];

    // Check active handles (includes timers)
    const activeHandles = (process as any)._getActiveHandles?.()?.length || 0;

    if (activeHandles > 100) {
      leaks.push({
        type: 'Timer',
        severity: activeHandles > 500 ? 'high' : 'medium',
        size: activeHandles * 100,
        count: activeHandles,
        recommendation: 'Clear intervals and timeouts when no longer needed',
      });
    }

    return leaks;
  }

  /**
   * Compare two heap snapshots
   */
  static async compareSnapshots(
    snapshot1: HeapSnapshot,
    snapshot2: HeapSnapshot
  ): Promise<{
    growth: number;
    newObjects: number;
    deletedObjects: number;
    recommendations: string[];
  }> {
    const growth = snapshot2.size - snapshot1.size;
    const objectDiff =
      (snapshot2.summary?.totalObjects || 0) -
      (snapshot1.summary?.totalObjects || 0);

    const recommendations: string[] = [];

    if (growth > 10 * 1024 * 1024) {
      recommendations.push(
        'Significant memory growth detected. Check for memory leaks.'
      );
    }

    if (objectDiff > 10000) {
      recommendations.push(
        'Large number of new objects created. Review object lifecycle.'
      );
    }

    return {
      growth,
      newObjects: Math.max(0, objectDiff),
      deletedObjects: Math.max(0, -objectDiff),
      recommendations,
    };
  }
}

/**
 * Internal class to manage profiling sessions
 */
class ProfileSession {
  private startTime: number = 0;

  private endTime: number = 0;

  private snapshots: HeapSnapshot[] = [];

  private allocations: AllocationProfile[] = [];

  private leaks: DetectedLeak[] = [];

  private collectionInterval: NodeJS.Timeout | null = null;

  private initialMemory: number = 0;

  private peakMemory: number = 0;

  private gcCollections: number = 0;

  constructor(
    private profileId: string,
    private options: ProfileOptions
  ) {
    this.options = {
      duration: 60000,
      interval: 5000,
      includeSnapshots: true,
      includeSampling: true,
      ...options,
    };
  }

  async start(): Promise<void> {
    this.startTime = Date.now();
    this.initialMemory = process.memoryUsage().heapUsed;
    this.peakMemory = this.initialMemory;

    // Set up GC tracking
    if (global.gc) {
      const originalGC = global.gc;
      global.gc = () => {
        this.gcCollections++;
        originalGC();
      };
    }

    // Start collection
    if (this.options.includeSampling) {
      this.startSampling();
    }

    // Auto-stop after duration
    if (this.options.duration) {
      setTimeout(() => this.stop(), this.options.duration);
    }

    console.log(`[MemoryProfiler] Started profiling session ${this.profileId}`);
  }

  private startSampling(): void {
    this.collectionInterval = setInterval(async () => {
      const currentMemory = process.memoryUsage().heapUsed;
      this.peakMemory = Math.max(this.peakMemory, currentMemory);

      // Collect allocation profile
      if (this.options.includeSampling) {
        const allocProfile = await this.collectAllocationProfile();
        this.allocations.push(allocProfile);
      }

      // Take periodic snapshots
      if (this.options.includeSnapshots && this.snapshots.length < 10) {
        try {
          const snapshot = await MemoryProfiler.takeHeapSnapshot();
          this.snapshots.push(snapshot);
        } catch (error) {
          console.error('[MemoryProfiler] Failed to take snapshot:', error);
        }
      }
    }, this.options.interval);
  }

  private async collectAllocationProfile(): Promise<AllocationProfile> {
    const memory = process.memoryUsage();

    return {
      timestamp: Date.now(),
      allocations: 0, // Would need V8 profiler API
      deallocations: 0,
      netAllocations: memory.heapUsed,
      largestAllocation: 0,
      fragmentationRatio: memory.external / memory.heapTotal,
    };
  }

  async stop(): Promise<MemoryProfile> {
    this.endTime = Date.now();

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    // Final snapshot
    if (this.options.includeSnapshots) {
      try {
        const finalSnapshot = await MemoryProfiler.takeHeapSnapshot();
        this.snapshots.push(finalSnapshot);
      } catch (error) {
        console.error('[MemoryProfiler] Failed to take final snapshot:', error);
      }
    }

    // Detect leaks
    this.leaks = await MemoryProfiler.detectLeaks(this.options.webContentsId);

    // Generate profile
    const profile = this.generateProfile();

    // Save if output path specified
    if (this.options.outputPath) {
      await this.saveProfile(profile);
    }

    console.log(`[MemoryProfiler] Stopped profiling session ${this.profileId}`);

    return profile;
  }

  private generateProfile(): MemoryProfile {
    const finalMemory = process.memoryUsage().heapUsed;
    const duration = this.endTime - this.startTime;
    const memoryGrowth = finalMemory - this.initialMemory;

    // Calculate average memory
    const averageMemory =
      this.allocations.length > 0
        ? this.allocations.reduce((sum, a) => sum + a.netAllocations, 0) /
          this.allocations.length
        : (this.initialMemory + finalMemory) / 2;

    // Calculate fragmentation
    const fragmentationLevel =
      this.allocations.length > 0
        ? this.allocations.reduce((sum, a) => sum + a.fragmentationRatio, 0) /
          this.allocations.length
        : 0;

    // Generate recommendation
    let recommendation = 'Memory usage appears normal.';

    if (memoryGrowth > 50 * 1024 * 1024) {
      recommendation =
        'Significant memory growth detected. Review for memory leaks.';
    } else if (this.leaks.length > 0) {
      recommendation = `${this.leaks.length} potential memory leaks detected. Review and fix.`;
    } else if (fragmentationLevel > 0.3) {
      recommendation =
        'High memory fragmentation. Consider optimizing allocations.';
    }

    return {
      id: this.profileId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      snapshots: this.snapshots,
      allocations: this.allocations,
      leaks: this.leaks,
      summary: {
        initialMemory: this.initialMemory,
        finalMemory,
        peakMemory: this.peakMemory,
        averageMemory,
        memoryGrowth,
        gcCollections: this.gcCollections,
        leaksDetected: this.leaks.length,
        fragmentationLevel,
        recommendation,
      },
    };
  }

  private async saveProfile(profile: MemoryProfile): Promise<void> {
    try {
      await fs.writeFile(
        this.options.outputPath!,
        JSON.stringify(profile, null, 2)
      );
      console.log(
        `[MemoryProfiler] Profile saved to ${this.options.outputPath}`
      );
    } catch (error) {
      console.error('[MemoryProfiler] Failed to save profile:', error);
    }
  }
}
