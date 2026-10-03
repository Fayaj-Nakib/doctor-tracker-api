import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { formatIssues } from './validate';

// Express identifies error handlers by their 4 parameters, so _next must stay
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Invalid request', details: formatIssues(err.issues) },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid ${err.path}` } });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed',
        details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
      },
    });
    return;
  }

  if (typeof err === 'object' && err !== null && 'code' in err && err.code === 11000) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists',
        details: err.keyValue,
      },
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      ...(env.NODE_ENV !== 'production' && { details: String(err?.stack ?? err) }),
    },
  });
};
