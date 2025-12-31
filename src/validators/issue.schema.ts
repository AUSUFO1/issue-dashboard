import { z } from 'zod';
import { ISSUE_STATUS, ISSUE_PRIORITY, ISSUE_TYPE } from '@/lib/constants';

// Helper to create enum validator from const object
const createEnumValidator = <T extends Record<string, string>>(
  enumObj: T,
  errorMessage: string
) => {
  const values = Object.values(enumObj) as [string, ...string[]];
  return z.enum(values, {
    message: errorMessage,
  });
};

// CREATE ISSUE SCHEMA
export const createIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  type: createEnumValidator(ISSUE_TYPE, 'Invalid issue type'),
  priority: createEnumValidator(
    ISSUE_PRIORITY,
    'Invalid priority level'
  ).default(ISSUE_PRIORITY.MEDIUM),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10, 'Cannot have more than 10 tags')
    .optional()
    .default([]),
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
});

// UPDATE ISSUE SCHEMA (all fields optional)

export const updateIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional(),
  status: createEnumValidator(ISSUE_STATUS, 'Invalid status').optional(),
  priority: createEnumValidator(
    ISSUE_PRIORITY,
    'Invalid priority level'
  ).optional(),
  type: createEnumValidator(ISSUE_TYPE, 'Invalid issue type').optional(),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10, 'Cannot have more than 10 tags')
    .optional(),
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .nullable()
    .optional(),
});

// QUERY/FILTER SCHEMA
export const issueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'priority', 'status', 'title'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z
    .string()
    .transform((val) => val.split(','))
    .pipe(z.array(createEnumValidator(ISSUE_STATUS, 'Invalid status')))
    .optional(),
  priority: z
    .string()
    .transform((val) => val.split(','))
    .pipe(z.array(createEnumValidator(ISSUE_PRIORITY, 'Invalid priority')))
    .optional(),
  type: z
    .string()
    .transform((val) => val.split(','))
    .pipe(z.array(createEnumValidator(ISSUE_TYPE, 'Invalid type')))
    .optional(),
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
  reportedBy: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .optional(),
  search: z.string().trim().min(1).max(100).optional(),
  tags: z
    .string()
    .transform((val) =>
      val
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().min(1)))
    .optional(),
});

// COMMENT SCHEMAS
export const createCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Comment must be at least 1 character')
    .max(2000, 'Comment cannot exceed 2000 characters'),
});

export const updateCommentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Comment must be at least 1 character')
    .max(2000, 'Comment cannot exceed 2000 characters'),
});

// ASSIGN ISSUE SCHEMA
export const assignIssueSchema = z.object({
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .nullable(),
});

// TYPESCRIPT TYPES (inferred from schemas)
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type IssueQueryInput = z.infer<typeof issueQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type AssignIssueInput = z.infer<typeof assignIssueSchema>;
