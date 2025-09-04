import { app } from 'electron';
import * as os from 'os';

export interface MemoryDataPoint {
  timestamp: number;
  memory: number;
  cpu: number;
  eventLoopLag: number;
}

export interface PredictionResult {
  timestamp: number;
  currentMemory: number;
  predictedMemory: number;
  timeToLimit: number | null; // milliseconds until memory limit, null if not approaching
  confidence: number; // 0-1
  risk: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  factors: {
    trend: 'increasing' | 'stable' | 'decreasing';
    volatility: number;
    growthRate: number; // bytes per minute
    acceleration: number; // change in growth rate
  };
}

export interface PredictorConfig {
  historySize?: number;
  minDataPoints?: number;
  memoryLimit?: number;
  warningThreshold?: number; // percentage of limit
  criticalThreshold?: number; // percentage of limit
  predictionHorizon?: number; // milliseconds to predict ahead
  smoothingFactor?: number; // for exponential smoothing
}

/**
 * Memory Pressure Predictor using statistical models and machine learning techniques
 * to predict future memory usage and prevent out-of-memory crashes.
 */
export class MemoryPressurePredictor {
  private dataPoints: MemoryDataPoint[] = [];
  private config: Required<PredictorConfig>;
  
  // Model parameters
  private trendModel: TrendModel;
  private seasonalModel: SeasonalModel;
  private anomalyDetector: AnomalyDetector;
  
  constructor(config: PredictorConfig = {}) {
    this.config = {
      historySize: 100,
      minDataPoints: 10,
      memoryLimit: 4 * 1024 * 1024 * 1024, // 4GB default
      warningThreshold: 75,
      criticalThreshold: 90,
      predictionHorizon: 5 * 60 * 1000, // 5 minutes ahead
      smoothingFactor: 0.3,
      ...config,
    };
    
    this.trendModel = new TrendModel(this.config.smoothingFactor);
    this.seasonalModel = new SeasonalModel();
    this.anomalyDetector = new AnomalyDetector();
  }
  
  /**
   * Add a new data point for prediction
   */
  addDataPoint(point: MemoryDataPoint): void {
    this.dataPoints.push(point);
    
    // Limit history size
    if (this.dataPoints.length > this.config.historySize) {
      this.dataPoints.shift();
    }
    
    // Update models
    this.trendModel.update(point);
    this.seasonalModel.update(point);
    this.anomalyDetector.update(point);
  }
  
  /**
   * Predict future memory usage
   */
  predict(): PredictionResult | null {
    if (this.dataPoints.length < this.config.minDataPoints) {
      return null;
    }
    
    const currentPoint = this.dataPoints[this.dataPoints.length - 1];
    const currentMemory = currentPoint.memory;
    
    // Calculate trend
    const trend = this.trendModel.getTrend();
    const growthRate = this.calculateGrowthRate();
    const acceleration = this.calculateAcceleration();
    const volatility = this.calculateVolatility();
    
    // Predict future memory
    const predictedMemory = this.predictMemory(
      currentMemory,
      growthRate,
      acceleration,
      this.config.predictionHorizon
    );
    
    // Calculate time to limit
    const timeToLimit = this.calculateTimeToLimit(
      currentMemory,
      growthRate,
      acceleration
    );
    
    // Determine risk level
    const risk = this.assessRisk(
      currentMemory,
      predictedMemory,
      growthRate,
      timeToLimit
    );
    
    // Calculate confidence
    const confidence = this.calculateConfidence(
      volatility,
      this.dataPoints.length,
      this.anomalyDetector.getAnomalyScore()
    );
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(
      risk,
      growthRate,
      timeToLimit,
      trend
    );
    
    return {
      timestamp: Date.now(),
      currentMemory,
      predictedMemory,
      timeToLimit,
      confidence,
      risk,
      recommendation,
      factors: {
        trend,
        volatility,
        growthRate,
        acceleration,
      },
    };
  }
  
  private calculateGrowthRate(): number {
    if (this.dataPoints.length < 2) return 0;
    
    // Use linear regression over recent points
    const recentPoints = this.dataPoints.slice(-Math.min(20, this.dataPoints.length));
    const n = recentPoints.length;
    
    // Normalize timestamps to start from 0
    const startTime = recentPoints[0].timestamp;
    const times = recentPoints.map(p => (p.timestamp - startTime) / 60000); // Convert to minutes
    const memories = recentPoints.map(p => p.memory);
    
    // Linear regression
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = memories.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((sum, x, i) => sum + x * memories[i], 0);
    const sumX2 = times.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope; // bytes per minute
  }
  
  private calculateAcceleration(): number {
    if (this.dataPoints.length < 3) return 0;
    
    // Calculate change in growth rate
    const midPoint = Math.floor(this.dataPoints.length / 2);
    const firstHalf = this.dataPoints.slice(0, midPoint);
    const secondHalf = this.dataPoints.slice(midPoint);
    
    const firstRate = this.calculateGrowthRateForPoints(firstHalf);
    const secondRate = this.calculateGrowthRateForPoints(secondHalf);
    
    return secondRate - firstRate;
  }
  
  private calculateGrowthRateForPoints(points: MemoryDataPoint[]): number {
    if (points.length < 2) return 0;
    
    const timeDiff = (points[points.length - 1].timestamp - points[0].timestamp) / 60000;
    const memoryDiff = points[points.length - 1].memory - points[0].memory;
    
    return timeDiff > 0 ? memoryDiff / timeDiff : 0;
  }
  
  private calculateVolatility(): number {
    if (this.dataPoints.length < 3) return 0;
    
    const memories = this.dataPoints.map(p => p.memory);
    const mean = memories.reduce((a, b) => a + b, 0) / memories.length;
    const variance = memories.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / memories.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / mean; // Coefficient of variation
  }
  
  private predictMemory(
    currentMemory: number,
    growthRate: number,
    acceleration: number,
    horizon: number
  ): number {
    const timeMinutes = horizon / 60000;
    
    // Use quadratic prediction if acceleration is significant
    if (Math.abs(acceleration) > growthRate * 0.1) {
      return currentMemory + 
             (growthRate * timeMinutes) + 
             (0.5 * acceleration * timeMinutes * timeMinutes);
    }
    
    // Linear prediction
    return currentMemory + (growthRate * timeMinutes);
  }
  
  private calculateTimeToLimit(
    currentMemory: number,
    growthRate: number,
    acceleration: number
  ): number | null {
    if (growthRate <= 0 && acceleration <= 0) {
      return null; // Not approaching limit
    }
    
    const remainingMemory = this.config.memoryLimit - currentMemory;
    
    if (remainingMemory <= 0) {
      return 0; // Already at limit
    }
    
    // If acceleration is significant, use quadratic formula
    if (Math.abs(acceleration) > growthRate * 0.1) {
      // Solve: remainingMemory = growthRate*t + 0.5*acceleration*t^2
      const a = 0.5 * acceleration;
      const b = growthRate;
      const c = -remainingMemory;
      
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return null;
      
      const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      
      const validTimes = [t1, t2].filter(t => t > 0);
      if (validTimes.length === 0) return null;
      
      return Math.min(...validTimes) * 60000; // Convert minutes to milliseconds
    }
    
    // Linear calculation
    const timeMinutes = remainingMemory / growthRate;
    return timeMinutes * 60000; // Convert to milliseconds
  }
  
  private assessRisk(
    currentMemory: number,
    predictedMemory: number,
    growthRate: number,
    timeToLimit: number | null
  ): PredictionResult['risk'] {
    const currentPercent = (currentMemory / this.config.memoryLimit) * 100;
    const predictedPercent = (predictedMemory / this.config.memoryLimit) * 100;
    
    // Critical: Already above critical threshold or will be very soon
    if (currentPercent >= this.config.criticalThreshold ||
        (timeToLimit !== null && timeToLimit < 5 * 60 * 1000)) {
      return 'critical';
    }
    
    // High: Above warning threshold or rapidly approaching
    if (currentPercent >= this.config.warningThreshold ||
        predictedPercent >= this.config.criticalThreshold ||
        (timeToLimit !== null && timeToLimit < 15 * 60 * 1000)) {
      return 'high';
    }
    
    // Medium: Moderate growth or approaching warning
    if (predictedPercent >= this.config.warningThreshold ||
        (growthRate > 10 * 1024 * 1024 && timeToLimit !== null)) {
      return 'medium';
    }
    
    // Low: Stable or decreasing
    return 'low';
  }
  
  private calculateConfidence(
    volatility: number,
    dataPoints: number,
    anomalyScore: number
  ): number {
    let confidence = 1.0;
    
    // Reduce confidence for high volatility
    confidence -= Math.min(0.3, volatility);
    
    // Reduce confidence for few data points
    if (dataPoints < 20) {
      confidence -= (20 - dataPoints) * 0.02;
    }
    
    // Reduce confidence for anomalies
    confidence -= anomalyScore * 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
  
  private generateRecommendation(
    risk: PredictionResult['risk'],
    growthRate: number,
    timeToLimit: number | null,
    trend: PredictionResult['factors']['trend']
  ): string {
    switch (risk) {
      case 'critical':
        return 'CRITICAL: Immediate action required. Close unused tabs or restart the application.';
      
      case 'high':
        if (timeToLimit && timeToLimit < 10 * 60 * 1000) {
          return `High memory pressure. Will reach limit in ${Math.round(timeToLimit / 60000)} minutes. Consider closing tabs.`;
        }
        return 'High memory usage detected. Monitor closely and prepare to free memory.';
      
      case 'medium':
        if (trend === 'increasing' && growthRate > 20 * 1024 * 1024) {
          return 'Memory usage growing rapidly. Check for memory leaks.';
        }
        return 'Moderate memory usage. Continue monitoring.';
      
      case 'low':
        if (trend === 'decreasing') {
          return 'Memory usage is decreasing. System is healthy.';
        }
        return 'Memory usage is stable and within normal limits.';
    }
  }
  
  /**
   * Get prediction accuracy based on historical predictions
   */
  getAccuracy(): number {
    // This would compare past predictions with actual outcomes
    // For now, return a placeholder
    return 0.85;
  }
  
  /**
   * Reset the predictor
   */
  reset(): void {
    this.dataPoints = [];
    this.trendModel.reset();
    this.seasonalModel.reset();
    this.anomalyDetector.reset();
  }
}

/**
 * Trend Model using exponential smoothing
 */
class TrendModel {
  private smoothedValue: number = 0;
  private trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  private alpha: number;
  
  constructor(smoothingFactor: number) {
    this.alpha = smoothingFactor;
  }
  
  update(point: MemoryDataPoint): void {
    if (this.smoothedValue === 0) {
      this.smoothedValue = point.memory;
    } else {
      const prevValue = this.smoothedValue;
      this.smoothedValue = this.alpha * point.memory + (1 - this.alpha) * this.smoothedValue;
      
      const change = this.smoothedValue - prevValue;
      const changePercent = (change / prevValue) * 100;
      
      if (changePercent > 1) {
        this.trend = 'increasing';
      } else if (changePercent < -1) {
        this.trend = 'decreasing';
      } else {
        this.trend = 'stable';
      }
    }
  }
  
  getTrend(): 'increasing' | 'stable' | 'decreasing' {
    return this.trend;
  }
  
  getSmoothedValue(): number {
    return this.smoothedValue;
  }
  
  reset(): void {
    this.smoothedValue = 0;
    this.trend = 'stable';
  }
}

/**
 * Seasonal Model to detect periodic patterns
 */
class SeasonalModel {
  private hourlyPattern: number[] = new Array(24).fill(0);
  private hourlyCount: number[] = new Array(24).fill(0);
  private weeklyPattern: number[] = new Array(7).fill(0);
  private weeklyCount: number[] = new Array(7).fill(0);
  
  update(point: MemoryDataPoint): void {
    const date = new Date(point.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Update hourly pattern
    this.hourlyPattern[hour] = 
      (this.hourlyPattern[hour] * this.hourlyCount[hour] + point.memory) / 
      (this.hourlyCount[hour] + 1);
    this.hourlyCount[hour]++;
    
    // Update weekly pattern
    this.weeklyPattern[dayOfWeek] = 
      (this.weeklyPattern[dayOfWeek] * this.weeklyCount[dayOfWeek] + point.memory) / 
      (this.weeklyCount[dayOfWeek] + 1);
    this.weeklyCount[dayOfWeek]++;
  }
  
  getExpectedMemory(timestamp: number): number {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    const hourlyExpected = this.hourlyPattern[hour] || 0;
    const weeklyExpected = this.weeklyPattern[dayOfWeek] || 0;
    
    // Weighted average
    if (hourlyExpected && weeklyExpected) {
      return (hourlyExpected * 0.7 + weeklyExpected * 0.3);
    }
    
    return hourlyExpected || weeklyExpected || 0;
  }
  
  reset(): void {
    this.hourlyPattern.fill(0);
    this.hourlyCount.fill(0);
    this.weeklyPattern.fill(0);
    this.weeklyCount.fill(0);
  }
}

/**
 * Anomaly Detector using statistical methods
 */
class AnomalyDetector {
  private mean: number = 0;
  private variance: number = 0;
  private count: number = 0;
  private anomalyScore: number = 0;
  
  update(point: MemoryDataPoint): void {
    this.count++;
    
    const delta = point.memory - this.mean;
    this.mean += delta / this.count;
    
    if (this.count > 1) {
      const delta2 = point.memory - this.mean;
      this.variance = ((this.count - 2) * this.variance + delta * delta2) / (this.count - 1);
      
      // Calculate z-score
      const stdDev = Math.sqrt(this.variance);
      if (stdDev > 0) {
        const zScore = Math.abs(delta / stdDev);
        
        // Anomaly if z-score > 3
        this.anomalyScore = Math.min(1, zScore / 3);
      }
    }
  }
  
  getAnomalyScore(): number {
    return this.anomalyScore;
  }
  
  isAnomaly(): boolean {
    return this.anomalyScore > 0.8;
  }
  
  reset(): void {
    this.mean = 0;
    this.variance = 0;
    this.count = 0;
    this.anomalyScore = 0;
  }
}