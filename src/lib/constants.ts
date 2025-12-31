export const APP_NAME = 'Issue Dashboard';
export const APP_DESCRIPTION = 'Production-grade issue management system';

// USER ROLES (Keep existing pattern for backward compatibility)
export const ROLES = {
  USER: 'USER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// ISSUE STATUS (Keep existing pattern to match models)
export const ISSUE_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export type IssueStatus = (typeof ISSUE_STATUS)[keyof typeof ISSUE_STATUS];

// ISSUE PRIORITY (Keep existing pattern to match models)
export const ISSUE_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type IssuePriority =
  (typeof ISSUE_PRIORITY)[keyof typeof ISSUE_PRIORITY];

// ISSUE TYPES (Keep existing pattern to match models)
export const ISSUE_TYPE = {
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  TASK: 'TASK',
  INCIDENT: 'INCIDENT',
} as const;

export type IssueType = (typeof ISSUE_TYPE)[keyof typeof ISSUE_TYPE];

// STATUS WORKFLOW TRANSITIONS
export const STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [ISSUE_STATUS.OPEN]: [ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.IN_PROGRESS]: [
    ISSUE_STATUS.OPEN,
    ISSUE_STATUS.RESOLVED,
    ISSUE_STATUS.CLOSED,
  ],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.OPEN], // Can reopen
  [ISSUE_STATUS.CLOSED]: [ISSUE_STATUS.OPEN], // Can reopen
};

// Helper function to validate status transitions
export function canTransitionStatus(
  currentStatus: IssueStatus,
  newStatus: IssueStatus
): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// Priority colors for badges
export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  [ISSUE_PRIORITY.LOW]: 'text-gray-600 bg-gray-100 border-gray-200',
  [ISSUE_PRIORITY.MEDIUM]: 'text-blue-600 bg-blue-100 border-blue-200',
  [ISSUE_PRIORITY.HIGH]: 'text-orange-600 bg-orange-100 border-orange-200',
  [ISSUE_PRIORITY.CRITICAL]: 'text-red-600 bg-red-100 border-red-200',
};

// Status colors for badges
export const STATUS_COLORS: Record<IssueStatus, string> = {
  [ISSUE_STATUS.OPEN]: 'text-purple-600 bg-purple-100 border-purple-200',
  [ISSUE_STATUS.IN_PROGRESS]: 'text-blue-600 bg-blue-100 border-blue-200',
  [ISSUE_STATUS.RESOLVED]: 'text-green-600 bg-green-100 border-green-200',
  [ISSUE_STATUS.CLOSED]: 'text-gray-600 bg-gray-100 border-gray-200',
};

// Type colors for badges
export const TYPE_COLORS: Record<IssueType, string> = {
  [ISSUE_TYPE.BUG]: 'text-red-600 bg-red-100 border-red-200',
  [ISSUE_TYPE.FEATURE]: 'text-green-600 bg-green-100 border-green-200',
  [ISSUE_TYPE.TASK]: 'text-blue-600 bg-blue-100 border-blue-200',
  [ISSUE_TYPE.INCIDENT]: 'text-orange-600 bg-orange-100 border-orange-200',
};

// PAGINATION
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Legacy exports for backward compatibility
export const DEFAULT_PAGE_SIZE = PAGINATION.DEFAULT_LIMIT;
export const MAX_PAGE_SIZE = PAGINATION.MAX_LIMIT;

// AUTHENTICATION & SECURITY
export const AUTH = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  JWT_ACCESS_TOKEN_EXPIRY: '15m',
  JWT_REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_SALT_ROUNDS: 12,
} as const;

// Legacy exports for backward compatibility
export const MAX_LOGIN_ATTEMPTS = AUTH.MAX_LOGIN_ATTEMPTS;
export const LOCKOUT_DURATION = AUTH.LOCKOUT_DURATION_MS;
export const JWT_EXPIRES_IN = AUTH.JWT_ACCESS_TOKEN_EXPIRY;
export const REFRESH_TOKEN_EXPIRES_IN = AUTH.JWT_REFRESH_TOKEN_EXPIRY;

// RATE LIMITING
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // General API requests
  AUTH_MAX_REQUESTS: 5, // Login/register attempts
} as const;

// Legacy exports for backward compatibility
export const RATE_LIMIT_WINDOW = RATE_LIMIT.WINDOW_MS;
export const RATE_LIMIT_MAX_REQUESTS = RATE_LIMIT.MAX_REQUESTS;

// VALIDATION LIMITS
export const VALIDATION = {
  ISSUE_TITLE_MIN: 5,
  ISSUE_TITLE_MAX: 200,
  ISSUE_DESCRIPTION_MIN: 10,
  ISSUE_DESCRIPTION_MAX: 5000,
  ISSUE_TAGS_MAX: 10,
  COMMENT_TEXT_MIN: 1,
  COMMENT_TEXT_MAX: 2000,
} as const;
