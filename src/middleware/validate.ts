import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ApiError } from '../utils/ApiError';

export function formatIssues(issues: z.ZodError['issues']) {
  return issues.map((issue) => ({
    field: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

export const validateBody =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(ApiError.badRequest('Invalid request body', formatIssues(result.error.issues)));
    }
    req.body = result.data;
    next();
  };
