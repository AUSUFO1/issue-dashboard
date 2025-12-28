import {
  ROLES,
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  ISSUE_TYPE,
} from '@/lib/constants';

// Extract type from const object
export type Role = (typeof ROLES)[keyof typeof ROLES];
export type IssueStatus = (typeof ISSUE_STATUS)[keyof typeof ISSUE_STATUS];
export type IssuePriority =
  (typeof ISSUE_PRIORITY)[keyof typeof ISSUE_PRIORITY];
export type IssueType = (typeof ISSUE_TYPE)[keyof typeof ISSUE_TYPE];

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  // Additional profile fields if needed
}

// Issue Types
export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  tags: string[];
  reportedBy: User;
  assignedTo: User | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface IssueDetail extends Issue {
  comments: Comment[];
  auditLogs: AuditLog[];
}

// Comment Types
export interface Comment {
  id: string;
  issueId: string;
  userId: string;
  user: User;
  text: string;
  createdAt: string;
  updatedAt: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  issueId: string;
  userId: string;
  user: User;
  action: string;
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Query Types
export interface IssueFilters {
  page?: number;
  limit?: number;
  status?: IssueStatus[];
  priority?: IssuePriority[];
  type?: IssueType[];
  assignedTo?: string;
  reportedBy?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// Stats Types
export interface DashboardStats {
  total: number;
  byStatus: Record<IssueStatus, number>;
  byPriority: Record<IssuePriority, number>;
  recentIssues: Issue[];
}
