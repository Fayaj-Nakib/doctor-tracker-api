import type { CookieOptions, RequestHandler } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { AUTH_COOKIE } from './auth.constants';
import * as authService from './auth.service';

const cookieOptions: CookieOptions = {
  httpOnly: true, // JavaScript can't read it, so XSS can't steal it
  secure: env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',
  path: '/',
};

export const login: RequestHandler = async (req, res) => {
  const { token, user } = await authService.login(req.body);
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: env.JWT_EXPIRES_IN * 1000 });
  res.json({ data: user });
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  res.json({ data: await authService.getCurrentUser(req.user.id) });
};
