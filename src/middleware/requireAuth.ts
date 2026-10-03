import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../models/user.model';
import { AUTH_COOKIE } from '../modules/auth/auth.constants';
import { ApiError } from '../utils/ApiError';

/** Authentication: who is making this request? */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token: string | undefined = req.cookies?.[AUTH_COOKIE] ?? bearer;

  if (!token) return next(ApiError.unauthorized());

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload & {
      role: Role;
    };
    req.user = { id: String(payload.sub), role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized('Session expired or invalid. Please log in again.'));
  }
};

/** Authorization: is this user allowed to do this? */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
