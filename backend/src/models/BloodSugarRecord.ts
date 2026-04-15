/**
 * BloodSugarRecord Model
 * From Report: UC-A1.1 Update Profile - Blood sugar tracking
 * Implements blood sugar monitoring and tracking
 */

export interface BloodSugarRecord {
  id: string;
  userId: string;
  value: number; // mg/dL
  unit: 'mg/dL' | 'mmol/L';
  type: 'fasting' | 'post_prandial' | 'random' | 'hba1c';
  measurementTime: Date;
  mealContext?: {
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    timeFromMeal?: number; // minutes
    mealSize?: 'small' | 'medium' | 'large';
    mealCarbs?: number; // grams
  };
  symptoms?: string[];
  notes?: string;
  device?: {
    type: 'glucometer' | 'cgm' | 'manual';
    model?: string;
    serialNumber?: string;
  };
  location?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BloodSugarTrend {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  average: number;
  min: number;
  max: number;
  readings: number;
  targetRange: {
    min: number;
    max: number;
  };
  inRangePercentage: number;
  timeInRange: number; // percentage
  variability: number; // coefficient of variation
}

export interface BloodSugarInsight {
  type: 'high' | 'low' | 'trend' | 'pattern' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
  confidence: number;
  timestamp: Date;
  data?: any;
}

export interface BloodSugarAlert {
  id: string;
  userId: string;
  type: 'high_glucose' | 'low_glucose' | 'rapid_change' | 'pattern_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  actions?: Array<{
    type: 'medication' | 'exercise' | 'meal' | 'contact_doctor';
    description: string;
    completed: boolean;
  }>;
}
