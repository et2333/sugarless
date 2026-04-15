/**
 * BloodSugarService - Blood Sugar Tracking and Analysis
 * From Report: UC-A1.1 Update Profile - Blood sugar monitoring
 * Implements comprehensive blood sugar management
 */

import { BloodSugarRecord, BloodSugarTrend, BloodSugarInsight, BloodSugarAlert } from '../models/BloodSugarRecord';
import prisma from '../utils/prisma';

export class BloodSugarService {
  
  /**
   * Record new blood sugar reading
   */
  static async recordReading(data: Omit<BloodSugarRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BloodSugarRecord> {
    const record = await prisma.bloodSugarRecord.create({
      data: {
        userId: data.userId,
        value: data.value,
        unit: data.unit,
        type: data.type,
        measurementTime: data.measurementTime,
        mealContext: data.mealContext ? JSON.stringify(data.mealContext) : null,
        symptoms: data.symptoms ? JSON.stringify(data.symptoms) : null,
        notes: data.notes,
        device: data.device ? JSON.stringify(data.device) : null,
        location: data.location,
        tags: data.tags ? JSON.stringify(data.tags) : null,
      },
    });

    // Check for alerts
    await this.checkAlerts(record);

    // Generate insights
    await this.generateInsights(record.userId);

    return this.mapToModel(record);
  }

  /**
   * Get blood sugar trends for a period
   */
  static async getTrends(
    userId: string, 
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate?: Date,
    endDate?: Date
  ): Promise<BloodSugarTrend> {
    const now = new Date();
    let dateRange: { gte: Date; lte: Date };

    switch (period) {
      case 'day':
        dateRange = {
          gte: startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lte: endDate || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        };
        break;
      case 'week':
        const weekStart = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateRange = {
          gte: weekStart,
          lte: endDate || now,
        };
        break;
      case 'month':
        dateRange = {
          gte: startDate || new Date(now.getFullYear(), now.getMonth(), 1),
          lte: endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
        break;
      case 'quarter':
        const quarterStart = startDate || new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateRange = {
          gte: quarterStart,
          lte: endDate || new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0),
        };
        break;
      case 'year':
        dateRange = {
          gte: startDate || new Date(now.getFullYear(), 0, 1),
          lte: endDate || new Date(now.getFullYear(), 11, 31),
        };
        break;
    }

    const records = await prisma.bloodSugarRecord.findMany({
      where: {
        userId,
        measurementTime: dateRange,
      },
      orderBy: { measurementTime: 'asc' },
    });

    if (records.length === 0) {
      return this.getEmptyTrend(period);
    }

    const values = records.map(r => r.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate time in range
    const targetRange = this.getTargetRange(userId);
    const inRangeCount = values.filter(v => v >= targetRange.min && v <= targetRange.max).length;
    const inRangePercentage = (inRangeCount / values.length) * 100;

    // Calculate variability (coefficient of variation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    const variability = (standardDeviation / average) * 100;

    return {
      period,
      average: Math.round(average * 100) / 100,
      min,
      max,
      readings: records.length,
      targetRange,
      inRangePercentage: Math.round(inRangePercentage * 100) / 100,
      timeInRange: inRangePercentage,
      variability: Math.round(variability * 100) / 100,
    };
  }

  /**
   * Get blood sugar insights and patterns
   */
  static async getInsights(userId: string, limit: number = 10): Promise<BloodSugarInsight[]> {
    const insights = await prisma.bloodSugarInsight.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return insights.map(insight => ({
      type: insight.type as any,
      severity: insight.severity as any,
      message: insight.message,
      recommendation: insight.recommendation,
      confidence: insight.confidence,
      timestamp: insight.timestamp,
      data: insight.data ? JSON.parse(insight.data) : undefined,
    }));
  }

  /**
   * Get active alerts
   */
  static async getAlerts(userId: string, activeOnly: boolean = true): Promise<BloodSugarAlert[]> {
    const where: any = { userId };
    if (activeOnly) {
      where.acknowledged = false;
    }

    const alerts = await prisma.bloodSugarAlert.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    return alerts.map(alert => ({
      id: alert.id,
      userId: alert.userId,
      type: alert.type as any,
      severity: alert.severity as any,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt,
      actions: alert.actions ? JSON.parse(alert.actions) : undefined,
    }));
  }

  /**
   * Generate personalized insights
   */
  private static async generateInsights(userId: string): Promise<void> {
    const recentRecords = await prisma.bloodSugarRecord.findMany({
      where: { userId },
      orderBy: { measurementTime: 'desc' },
      take: 20,
    });

    if (recentRecords.length < 3) return;

    const insights: Omit<BloodSugarInsight, 'id'>[] = [];

    // High glucose pattern
    const highReadings = recentRecords.filter(r => r.value > 180);
    if (highReadings.length > recentRecords.length * 0.3) {
      insights.push({
        type: 'high',
        severity: 'medium',
        message: `High glucose detected in ${highReadings.length} recent readings`,
        recommendation: 'Consider adjusting medication timing or meal portions',
        confidence: 0.8,
        timestamp: new Date(),
        data: { count: highReadings.length, percentage: (highReadings.length / recentRecords.length) * 100 },
      });
    }

    // Low glucose pattern
    const lowReadings = recentRecords.filter(r => r.value < 70);
    if (lowReadings.length > 0) {
      insights.push({
        type: 'low',
        severity: 'high',
        message: `Low glucose detected in ${lowReadings.length} recent readings`,
        recommendation: 'Monitor closely and consider reducing medication dose',
        confidence: 0.9,
        timestamp: new Date(),
        data: { count: lowReadings.length, values: lowReadings.map(r => r.value) },
      });
    }

    // Trend analysis
    const trend = this.analyzeTrend(recentRecords);
    if (trend.direction !== 'stable') {
      insights.push({
        type: 'trend',
        severity: 'low',
        message: `Blood glucose trending ${trend.direction}`,
        recommendation: trend.recommendation,
        confidence: trend.confidence,
        timestamp: new Date(),
        data: { slope: trend.slope, r2: trend.r2 },
      });
    }

    // Save insights
    for (const insight of insights) {
      await prisma.bloodSugarInsight.create({
        data: {
          userId,
          type: insight.type,
          severity: insight.severity,
          message: insight.message,
          recommendation: insight.recommendation,
          confidence: insight.confidence,
          timestamp: insight.timestamp,
          data: insight.data ? JSON.stringify(insight.data) : null,
        },
      });
    }
  }

  /**
   * Check for alerts based on new reading
   */
  private static async checkAlerts(record: any): Promise<void> {
    const alerts: any[] = [];

    // High glucose alert
    if (record.value > 250) {
      alerts.push({
        userId: record.userId,
        type: 'high_glucose',
        severity: 'critical',
        message: `Critical high glucose: ${record.value} mg/dL`,
        value: record.value,
        threshold: 250,
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (record.value > 180) {
      alerts.push({
        userId: record.userId,
        type: 'high_glucose',
        severity: 'high',
        message: `High glucose: ${record.value} mg/dL`,
        value: record.value,
        threshold: 180,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Low glucose alert
    if (record.value < 54) {
      alerts.push({
        userId: record.userId,
        type: 'low_glucose',
        severity: 'critical',
        message: `Critical low glucose: ${record.value} mg/dL`,
        value: record.value,
        threshold: 54,
        timestamp: new Date(),
        acknowledged: false,
      });
    } else if (record.value < 70) {
      alerts.push({
        userId: record.userId,
        type: 'low_glucose',
        severity: 'high',
        message: `Low glucose: ${record.value} mg/dL`,
        value: record.value,
        threshold: 70,
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Save alerts
    for (const alert of alerts) {
      await prisma.bloodSugarAlert.create({
        data: alert,
      });
    }
  }

  /**
   * Analyze trend in recent readings
   */
  private static analyzeTrend(records: any[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    r2: number;
    confidence: number;
    recommendation: string;
  } {
    if (records.length < 3) {
      return {
        direction: 'stable',
        slope: 0,
        r2: 0,
        confidence: 0,
        recommendation: 'Need more data for trend analysis',
      };
    }

    // Simple linear regression
    const n = records.length;
    const x = records.map((_, i) => i);
    const y = records.map(r => r.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * i + intercept), 2), 0);
    const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let recommendation = 'Blood glucose is stable';

    if (Math.abs(slope) > 1) {
      if (slope > 0) {
        direction = 'increasing';
        recommendation = 'Consider adjusting medication or diet to lower glucose';
      } else {
        direction = 'decreasing';
        recommendation = 'Monitor for potential hypoglycemia';
      }
    }

    return {
      direction,
      slope,
      r2,
      confidence: Math.min(r2 * 0.9, 0.8), // Cap confidence
      recommendation,
    };
  }

  /**
   * Get target range for user
   */
  private static getTargetRange(userId: string): { min: number; max: number } {
    // Default targets, could be personalized based on user profile
    return { min: 70, max: 180 };
  }

  /**
   * Get empty trend for periods with no data
   */
  private static getEmptyTrend(period: string): BloodSugarTrend {
    return {
      period: period as any,
      average: 0,
      min: 0,
      max: 0,
      readings: 0,
      targetRange: { min: 70, max: 180 },
      inRangePercentage: 0,
      timeInRange: 0,
      variability: 0,
    };
  }

  /**
   * Map database record to model
   */
  private static mapToModel(record: any): BloodSugarRecord {
    return {
      id: record.id,
      userId: record.userId,
      value: record.value,
      unit: record.unit,
      type: record.type,
      measurementTime: record.measurementTime,
      mealContext: record.mealContext ? JSON.parse(record.mealContext) : undefined,
      symptoms: record.symptoms ? JSON.parse(record.symptoms) : undefined,
      notes: record.notes,
      device: record.device ? JSON.parse(record.device) : undefined,
      location: record.location,
      tags: record.tags ? JSON.parse(record.tags) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
