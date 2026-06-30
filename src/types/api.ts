/**
 * API request and response types for Glucose Tracking Application
 *
 * Defines the shape of data exchanged between client and server,
 * including request payloads, response structures, and pagination.
 */

import {
  DiabetesType,
  GlucoseContext,
  GlucoseReading,
  GlucoseThreshold,
  Profile,
  ReadingSource,
  Reminder,
  User
} from './database';

// ============================================================================
// Generic API Response
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Request Types - Glucose Readings
// ============================================================================

/**
 * Request to create a new glucose reading
 */
export interface CreateReadingRequest {
  value: number;                    // mg/dL (20-600)
  reading_date: string;             // ISO 8601 timestamp
  context: GlucoseContext;
  source: ReadingSource;
  notes?: string;                   // Max 500 chars
}

/**
 * Request to update an existing glucose reading
 */
export interface UpdateReadingRequest {
  value?: number;                   // mg/dL (20-600)
  reading_date?: string;            // ISO 8601 timestamp
  context?: GlucoseContext;
  source?: ReadingSource;
  notes?: string;                   // Max 500 chars
}

/**
 * Query parameters for listing glucose readings
 */
export interface ListReadingsQuery {
  page?: number;                    // Default: 1
  page_size?: number;               // Default: 50, max: 100
  start_date?: string;              // ISO 8601 date (inclusive)
  end_date?: string;                // ISO 8601 date (inclusive)
  context?: GlucoseContext;         // Filter by context
  source?: ReadingSource;           // Filter by source
  sort_by?: 'reading_date' | 'value' | 'created_at';
  sort_order?: 'asc' | 'desc';      // Default: desc
}

// ============================================================================
// Request Types - Profile
// ============================================================================

/**
 * Request to create or update a user profile
 */
export interface CreateProfileRequest {
  diabetes_type: DiabetesType;
  diagnosis_date?: string;          // ISO 8601 date (YYYY-MM-DD)
  date_of_birth?: string;           // ISO 8601 date (YYYY-MM-DD)
  weight?: number;                  // kg (positive number)
  height?: number;                  // cm (positive number)
  medication?: string;              // Max 1000 chars
  physician?: string;               // Max 255 chars
  physician_contact?: string;       // Max 255 chars
  notes?: string;                   // Max 2000 chars
}

/**
 * Request to update user profile (all fields optional)
 */
export interface UpdateProfileRequest {
  diabetes_type?: DiabetesType;
  diagnosis_date?: string;
  date_of_birth?: string;
  weight?: number;
  height?: number;
  medication?: string;
  physician?: string;
  physician_contact?: string;
  notes?: string;
}

// ============================================================================
// Request Types - Thresholds
// ============================================================================

/**
 * Request to create or update glucose thresholds
 */
export interface UpdateThresholdRequest {
  low: number;                      // mg/dL (must be < target_min)
  target_min: number;               // mg/dL (must be < target_max)
  target_max: number;               // mg/dL (must be < high)
  high: number;                     // mg/dL (must be > target_max)
}

// ============================================================================
// Request Types - Reminders
// ============================================================================

/**
 * Request to create a new reminder
 */
export interface CreateReminderRequest {
  title: string;                    // Max 255 chars
  description?: string;             // Max 1000 chars
  time: string;                     // HH:MM format
  days_of_week: number[];           // 0-6 (Sun-Sat)
  enabled: boolean;
}

/**
 * Request to update an existing reminder
 */
export interface UpdateReminderRequest {
  title?: string;
  description?: string;
  time?: string;
  days_of_week?: number[];
  enabled?: boolean;
}

// ============================================================================
// Request Types - Caregiver Access
// ============================================================================

/**
 * Request to grant caregiver access
 */
export interface GrantCaregiverAccessRequest {
  caregiver_email: string;          // Email of caregiver to grant access
  access_level: 'read' | 'write';
}

// ============================================================================
// Response Types - Readings List
// ============================================================================

/**
 * Response for listing glucose readings (paginated)
 */
export interface ReadingsListResponse {
  readings: GlucoseReading[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  summary?: {
    average: number;
    min: number;
    max: number;
    readings_in_range: number;
    readings_low: number;
    readings_high: number;
  };
}

// ============================================================================
// Response Types - Dashboard Stats
// ============================================================================

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  period: {
    start_date: string;             // ISO 8601 date
    end_date: string;               // ISO 8601 date
    days: number;
  };
  readings: {
    total: number;
    average: number;
    median?: number;
    std_deviation?: number;
    min: number;
    max: number;
  };
  distribution: {
    in_range: number;               // Count
    in_range_percent: number;       // Percentage
    low: number;                    // Count (< threshold.low)
    low_percent: number;            // Percentage
    high: number;                   // Count (> threshold.high)
    high_percent: number;           // Percentage
  };
  by_context: Array<{
    context: GlucoseContext;
    count: number;
    average: number;
  }>;
  trends?: {
    daily_averages: Array<{
      date: string;                 // ISO 8601 date
      average: number;
      count: number;
    }>;
  };
  thresholds: GlucoseThreshold;
}

// ============================================================================
// Response Types - Reports
// ============================================================================

/**
 * Request parameters for generating a report
 */
export interface ReportRequest {
  start_date: string;               // ISO 8601 date
  end_date: string;                 // ISO 8601 date
  include_charts?: boolean;         // Include chart data
  format?: 'json' | 'pdf' | 'csv';  // Export format
}

/**
 * Report data response
 */
export interface ReportData {
  user: Pick<User, 'id' | 'name' | 'email'>;
  profile: Profile;
  period: {
    start_date: string;
    end_date: string;
  };
  stats: DashboardStats;
  readings: GlucoseReading[];
  charts?: {
    daily_trend: Array<{
      date: string;
      average: number;
      min: number;
      max: number;
    }>;
    context_distribution: Array<{
      context: GlucoseContext;
      count: number;
      percentage: number;
    }>;
    time_of_day: Array<{
      hour: number;
      average: number;
      count: number;
    }>;
  };
  generated_at: string;             // ISO 8601 timestamp
}

// ============================================================================
// Response Types - User & Profile
// ============================================================================

/**
 * Complete user info with profile
 */
export interface UserWithProfile {
  user: User;
  profile: Profile | null;
  thresholds: GlucoseThreshold | null;
}

/**
 * Caregiver with access info
 */
export interface CaregiverWithAccess {
  id: string;
  name?: string;
  email: string;
  access_level: 'read' | 'write';
  granted_at: string;
}

/**
 * Patient accessible by caregiver
 */
export interface PatientAccessible {
  id: string;
  name?: string;
  email: string;
  access_level: 'read' | 'write';
  granted_at: string;
  last_reading?: {
    value: number;
    reading_date: string;
    context: GlucoseContext;
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Standard error codes
 */
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}
