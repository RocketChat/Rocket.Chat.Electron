import { app, webContents } from 'electron';
import type { WebContents } from 'electron';
import { MemoryFeature } from '../MemoryFeature';

export interface LeakPattern {
  webContentsId: number;
  url: string;
  type: 'steady_growth' | 'rapid_growth' | 'sawtooth' | 'plateau';
  confidence: number; // 0-1
  growthRate: number; // bytes per minute
  detectedAt: number;
  samples: MemorySample[];
}

export interface MemorySample {
  timestamp: number;
  memory: number;
  delta: number;
}

export interface LeakReport {
  timestamp: number;
  leaks: LeakPattern[];
  totalLeakedMemory: number;
  recommendedActions: string[];
}

/**
 * Memory Leak Detector that analyzes memory patterns to identify potential leaks.
 * Uses statistical analysis and pattern recognition to detect various types of memory leaks.
 */
export class MemoryLeakDetector extends MemoryFeature {
  private monitorInterval: NodeJS.Timeout | null = null;
  private memorySamples = new Map<number, MemorySample[]>();
  private detectedLeaks = new Map<number, LeakPattern>();
  private leakReports: LeakReport[] = [];
  
  // Configuration
  private readonly SAMPLE_INTERVAL = 30000; // 30 seconds
  private readonly MIN_SAMPLES_FOR_ANALYSIS = 10;
  private readonly MAX_SAMPLES_PER_WEBCONTENTS = 60; // 30 minutes of data
  private readonly LEAK_GROWTH_THRESHOLD = 1024 * 1024; // 1MB per minute
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  
  // Statistical thresholds
  private readonly STEADY_GROWTH_R_SQUARED = 0.8; // Linear regression threshold
  private readonly RAPID_GROWTH_MULTIPLIER = 3; // 3x average growth
  private readonly SAWTOOTH_VARIATION = 0.3; // 30% variation
  
  getName(): string {
    return 'MemoryLeakDetector';
  }
  
  protected async onEnable(): Promise<void> {
    this.startMonitoring();
    console.log('[MemoryLeakDetector] Enabled with pattern analysis');
  }
  
  protected async onDisable(): Promise<void> {
    this.stopMonitoring();
    this.memorySamples.clear();
    this.detectedLeaks.clear();
  }
  
  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.collectSamples();
      this.analyzePatterns();
    }, this.SAMPLE_INTERVAL);
  }
  
  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
  
  private collectSamples(): void {
    const metrics = app.getAppMetrics();
    const allWebContents = webContents.getAllWebContents();
    
    for (const wc of allWebContents) {
      if (wc.isDestroyed()) continue;
      
      const metric = metrics.find(m => 
        (m as any).webContents?.id === wc.id || 
        m.pid === (wc as any).getProcessId?.()
      );
      
      if (!metric) continue;
      
      const currentMemory = metric.memory.workingSetSize * 1024; // Convert to bytes
      const samples = this.memorySamples.get(wc.id) || [];
      const lastSample = samples[samples.length - 1];
      const delta = lastSample ? currentMemory - lastSample.memory : 0;
      
      const newSample: MemorySample = {
        timestamp: Date.now(),
        memory: currentMemory,
        delta,
      };
      
      samples.push(newSample);
      
      // Limit sample history
      if (samples.length > this.MAX_SAMPLES_PER_WEBCONTENTS) {
        samples.shift();
      }
      
      this.memorySamples.set(wc.id, samples);
    }
  }
  
  private analyzePatterns(): void {
    const newLeaks: LeakPattern[] = [];
    
    for (const [wcId, samples] of this.memorySamples.entries()) {
      if (samples.length < this.MIN_SAMPLES_FOR_ANALYSIS) continue;
      
      const wc = webContents.getAllWebContents().find(w => w.id === wcId);
      if (!wc || wc.isDestroyed()) continue;
      
      const pattern = this.detectLeakPattern(samples);
      if (pattern && pattern.confidence >= this.CONFIDENCE_THRESHOLD) {
        const leak: LeakPattern = {
          webContentsId: wcId,
          url: wc.getURL(),
          type: pattern.type,
          confidence: pattern.confidence,
          growthRate: pattern.growthRate,
          detectedAt: Date.now(),
          samples: samples.slice(-10), // Keep last 10 samples for reference
        };
        
        this.detectedLeaks.set(wcId, leak);
        newLeaks.push(leak);
        
        console.log(`[MemoryLeakDetector] Potential ${leak.type} leak detected in ${leak.url}`);
        console.log(`  Confidence: ${(leak.confidence * 100).toFixed(1)}%`);
        console.log(`  Growth rate: ${(leak.growthRate / 1024 / 1024).toFixed(2)} MB/min`);
      }
    }
    
    if (newLeaks.length > 0) {
      this.createLeakReport(newLeaks);
    }
  }
  
  private detectLeakPattern(samples: MemorySample[]): { type: LeakPattern['type'], confidence: number, growthRate: number } | null {
    // Check for steady growth (linear regression)
    const steadyGrowth = this.detectSteadyGrowth(samples);
    if (steadyGrowth && steadyGrowth.growthRate > this.LEAK_GROWTH_THRESHOLD) {
      return {
        type: 'steady_growth',
        confidence: steadyGrowth.rSquared,
        growthRate: steadyGrowth.growthRate,
      };
    }
    
    // Check for rapid growth
    const rapidGrowth = this.detectRapidGrowth(samples);
    if (rapidGrowth) {
      return {
        type: 'rapid_growth',
        confidence: rapidGrowth.confidence,
        growthRate: rapidGrowth.growthRate,
      };
    }
    
    // Check for sawtooth pattern (repeated allocate/partial-free cycles)
    const sawtooth = this.detectSawtoothPattern(samples);
    if (sawtooth) {
      return {
        type: 'sawtooth',
        confidence: sawtooth.confidence,
        growthRate: sawtooth.growthRate,
      };
    }
    
    // Check for plateau pattern (memory not being freed after spike)
    const plateau = this.detectPlateauPattern(samples);
    if (plateau) {
      return {
        type: 'plateau',
        confidence: plateau.confidence,
        growthRate: 0, // Plateau doesn't grow
      };
    }
    
    return null;
  }
  
  private detectSteadyGrowth(samples: MemorySample[]): { rSquared: number, growthRate: number } | null {
    if (samples.length < 5) return null;
    
    // Simple linear regression
    const n = samples.length;
    const times = samples.map((s, i) => i);
    const memories = samples.map(s => s.memory);
    
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = memories.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((sum, x, i) => sum + x * memories[i], 0);
    const sumX2 = times.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = memories.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = memories.reduce((sum, y, i) => {
      const yPredicted = slope * times[i] + intercept;
      return sum + Math.pow(y - yPredicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);
    
    // Convert slope to bytes per minute
    const samplesPerMinute = 60000 / this.SAMPLE_INTERVAL;
    const growthRate = slope * samplesPerMinute;
    
    return {
      rSquared: Math.max(0, Math.min(1, rSquared)),
      growthRate,
    };
  }
  
  private detectRapidGrowth(samples: MemorySample[]): { confidence: number, growthRate: number } | null {
    if (samples.length < 5) return null;
    
    const recentSamples = samples.slice(-5);
    const avgDelta = recentSamples.reduce((sum, s) => sum + Math.max(0, s.delta), 0) / recentSamples.length;
    
    const overallAvgDelta = samples.reduce((sum, s) => sum + Math.max(0, s.delta), 0) / samples.length;
    
    if (avgDelta > overallAvgDelta * this.RAPID_GROWTH_MULTIPLIER) {
      const samplesPerMinute = 60000 / this.SAMPLE_INTERVAL;
      return {
        confidence: Math.min(1, avgDelta / (overallAvgDelta * this.RAPID_GROWTH_MULTIPLIER)),
        growthRate: avgDelta * samplesPerMinute,
      };
    }
    
    return null;
  }
  
  private detectSawtoothPattern(samples: MemorySample[]): { confidence: number, growthRate: number } | null {
    if (samples.length < 10) return null;
    
    let peaks = 0;
    let valleys = 0;
    let overallGrowth = 0;
    
    for (let i = 1; i < samples.length - 1; i++) {
      const prev = samples[i - 1].memory;
      const curr = samples[i].memory;
      const next = samples[i + 1].memory;
      
      if (curr > prev && curr > next) peaks++;
      if (curr < prev && curr < next) valleys++;
    }
    
    // Check if we have alternating peaks and valleys
    const expectedCycles = Math.floor(samples.length / 4); // Expecting a cycle every 4 samples
    const actualCycles = Math.min(peaks, valleys);
    
    if (actualCycles >= expectedCycles * 0.7) {
      // Calculate overall growth despite sawtooth
      overallGrowth = samples[samples.length - 1].memory - samples[0].memory;
      const timeSpan = (samples.length - 1) * this.SAMPLE_INTERVAL;
      const growthRate = (overallGrowth / timeSpan) * 60000; // bytes per minute
      
      if (growthRate > this.LEAK_GROWTH_THRESHOLD) {
        return {
          confidence: actualCycles / expectedCycles,
          growthRate,
        };
      }
    }
    
    return null;
  }
  
  private detectPlateauPattern(samples: MemorySample[]): { confidence: number } | null {
    if (samples.length < 10) return null;
    
    // Look for a spike followed by stable high memory
    const maxMemory = Math.max(...samples.map(s => s.memory));
    const avgMemory = samples.reduce((sum, s) => sum + s.memory, 0) / samples.length;
    
    // Find where the spike occurred
    const spikeIndex = samples.findIndex(s => s.memory >= maxMemory * 0.95);
    if (spikeIndex < 0 || spikeIndex >= samples.length - 3) return null;
    
    // Check if memory stays high after spike
    const postSpikeSamples = samples.slice(spikeIndex);
    const postSpikeAvg = postSpikeSamples.reduce((sum, s) => sum + s.memory, 0) / postSpikeSamples.length;
    
    if (postSpikeAvg > avgMemory * 1.5) {
      // Check variation after spike (should be low for plateau)
      const postSpikeStdDev = Math.sqrt(
        postSpikeSamples.reduce((sum, s) => sum + Math.pow(s.memory - postSpikeAvg, 2), 0) / postSpikeSamples.length
      );
      
      const variationCoefficient = postSpikeStdDev / postSpikeAvg;
      
      if (variationCoefficient < 0.1) {
        return {
          confidence: 1 - variationCoefficient,
        };
      }
    }
    
    return null;
  }
  
  private createLeakReport(leaks: LeakPattern[]): void {
    const totalLeakedMemory = leaks.reduce((sum, leak) => {
      // Estimate leaked memory based on growth rate and time
      const timeElapsed = 10 * 60 * 1000; // 10 minutes
      return sum + (leak.growthRate * timeElapsed / 60000);
    }, 0);
    
    const report: LeakReport = {
      timestamp: Date.now(),
      leaks,
      totalLeakedMemory,
      recommendedActions: this.generateRecommendations(leaks),
    };
    
    this.leakReports.push(report);
    
    // Limit report history
    if (this.leakReports.length > 100) {
      this.leakReports.shift();
    }
    
    // Update metrics
    this.metrics.activations++;
    this.metrics.lastRun = Date.now();
    this.addMemorySaved(totalLeakedMemory); // Potential memory that could be saved
  }
  
  private generateRecommendations(leaks: LeakPattern[]): string[] {
    const recommendations: string[] = [];
    
    for (const leak of leaks) {
      switch (leak.type) {
        case 'steady_growth':
          recommendations.push(`Reload tab "${leak.url}" - steady memory growth detected`);
          recommendations.push('Check for event listener accumulation');
          recommendations.push('Review DOM node cleanup');
          break;
          
        case 'rapid_growth':
          recommendations.push(`URGENT: Reload tab "${leak.url}" immediately - rapid memory growth`);
          recommendations.push('Check for infinite loops or recursive allocations');
          break;
          
        case 'sawtooth':
          recommendations.push(`Monitor tab "${leak.url}" - irregular memory pattern`);
          recommendations.push('Check garbage collection effectiveness');
          recommendations.push('Review object pooling strategies');
          break;
          
        case 'plateau':
          recommendations.push(`Tab "${leak.url}" holding excessive memory`);
          recommendations.push('Check for large cached objects');
          recommendations.push('Review data retention policies');
          break;
      }
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }
  
  // Public API
  
  public getDetectedLeaks(): LeakPattern[] {
    return Array.from(this.detectedLeaks.values());
  }
  
  public getLeakReports(): LeakReport[] {
    return [...this.leakReports];
  }
  
  public clearLeakForWebContents(webContentsId: number): void {
    this.detectedLeaks.delete(webContentsId);
    this.memorySamples.delete(webContentsId);
  }
  
  public async analyzeWebContents(webContentsId: number): Promise<LeakPattern | null> {
    const samples = this.memorySamples.get(webContentsId);
    if (!samples || samples.length < this.MIN_SAMPLES_FOR_ANALYSIS) {
      return null;
    }
    
    const pattern = this.detectLeakPattern(samples);
    if (pattern && pattern.confidence >= this.CONFIDENCE_THRESHOLD) {
      const wc = webContents.getAllWebContents().find(w => w.id === webContentsId);
      if (!wc || wc.isDestroyed()) return null;
      
      return {
        webContentsId,
        url: wc.getURL(),
        type: pattern.type,
        confidence: pattern.confidence,
        growthRate: pattern.growthRate,
        detectedAt: Date.now(),
        samples: samples.slice(-10),
      };
    }
    
    return null;
  }
}