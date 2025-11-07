/**
 * Centralized Error Constants for Tests and Source Code
 *
 * This file contains all HTTP status codes and error messages used throughout
 * the application. This ensures consistency and makes maintenance easier.
 */

// ============================================
// HTTP Status Codes
// ============================================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================
// Error Messages - Comments
// ============================================
export const COMMENT_ERRORS = {
  NOT_FOUND: 'comment not found',
  UNAUTHORIZED_DELETE: 'You can only delete your own comments or comments on your posts',
} as const;

// ============================================
// Error Messages - Posts
// ============================================
export const POST_ERRORS = {
  NOT_FOUND: 'post not found',
  UNAUTHORIZED_DELETE: 'You can only delete your own posts',
} as const;

// ============================================
// Error Messages - Validation
// ============================================
export const VALIDATION_ERRORS = {
  MISSING_POST_ID: 'You must include the post ID for this comment!',
} as const;

// ============================================
// Policy Names - Posts
// ============================================
export const POST_POLICIES = {
  DELETE: 'is-post-author-delete',
} as const;

// ============================================
// Policy Names - Comments
// ============================================
export const COMMENT_POLICIES = {
  DELETE: 'is-comment-author-or-post-author-delete',
} as const;

// ============================================
// All Error Messages (for convenience)
// ============================================
export const ERROR_MESSAGES = {
  ...COMMENT_ERRORS,
  ...POST_ERRORS,
  ...VALIDATION_ERRORS,
} as const;
