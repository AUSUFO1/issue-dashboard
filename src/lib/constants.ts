export const APP_NAME = 'Issue Dashboard';
export const APP_DESCRIPTION = 'Production-grade issue management system';

// User Roles
export const ROLES = {
  USER: 'USER',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const;

// Issue Status
export const ISSUE_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

// Issue Priority
export const ISSUE_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// Issue Types
export const ISSUE_TYPE = {
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  TASK: 'TASK',
  INCIDENT: 'INCIDENT',
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Auth
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in ms
export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Rate Limiting
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
