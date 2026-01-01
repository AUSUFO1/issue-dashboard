import {
  UserRole,
  IssueStatus,
  IssuePriority,
  IssueType,
} from '@/lib/constants';

// USER TYPES

// Re-export UserRole as Role for backward compatibility
export type Role = UserRole;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface DecodedToken {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ISSUE TYPES

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  tags: string[];
  assignedTo?: User | string | null;
  reportedBy: User | string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  resolutionTime?: number | null; // Virtual field (hours)
}

export interface IssueListItem {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  tags: string[];
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  reportedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueDTO {
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  tags?: string[];
  assignedTo?: string; // User ID
}

export interface UpdateIssueDTO {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  type?: IssueType;
  tags?: string[];
  assignedTo?: string | null; // User ID or null to unassign
}

export interface IssueFilters {
  status?: IssueStatus | IssueStatus[];
  priority?: IssuePriority | IssuePriority[];
  type?: IssueType | IssueType[];
  assignedTo?: string; // User ID
  reportedBy?: string; // User ID
  search?: string; // Full-text search
  tags?: string[]; // Filter by tags
}

// COMMENT TYPES

export interface Comment {
  id: string;
  issueId: string;
  userId: string | User;
  text: string;
  isEdited: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentDTO {
  text: string;
}

export interface UpdateCommentDTO {
  text: string;
}

// AUDIT LOG TYPES

export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  COMMENTED = 'COMMENTED',
  COMMENT_EDITED = 'COMMENT_EDITED',
  COMMENT_DELETED = 'COMMENT_DELETED',
}

export interface AuditLog {
  id: string;
  issueId: string;
  userId: string | User;
  action: AuditAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Populated version for API responses
export interface PopulatedAuditLog {
  id: string;
  issueId: string | { title: string };
  userId: string | { firstName: string; lastName: string; email: string };
  action: AuditAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// PAGINATION TYPES

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// API RESPONSE TYPES

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// DASHBOARD STATS TYPES

export interface DashboardStats {
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  closedIssues: number;
  myAssignedIssues: number;
  myReportedIssues: number;
  criticalIssues: number;
  highPriorityIssues: number;
  averageResolutionTime: number; // in hours
  issuesByStatus: Record<IssueStatus, number>;
  issuesByPriority: Record<IssuePriority, number>;
  issuesByType: Record<IssueType, number>;
  recentActivity: PopulatedAuditLog[];
}
