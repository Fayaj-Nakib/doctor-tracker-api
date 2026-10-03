import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserModel, type Role } from '../../models/user.model';
import { ApiError } from '../../utils/ApiError';
import type { LoginInput } from './auth.schema';

type PublicUser = { id: string; name: string; email: string; role: Role };

function toPublicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}): PublicUser {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role as Role };
}

export async function login({ email, password }: LoginInput) {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  // Same message for unknown email and wrong password: don't reveal which accounts exist
  if (!user || !valid) throw ApiError.unauthorized('Invalid email or password');

  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });

  return { token, user: toPublicUser(user) };
}

export async function getCurrentUser(id: string) {
  const user = await UserModel.findById(id);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return toPublicUser(user);
}

/** Creates the admin account on first boot. Safe to run on every start. */
export async function ensureAdminUser() {
  const exists = await UserModel.exists({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (exists) return;

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await UserModel.create({ name: 'Admin', email: env.ADMIN_EMAIL, passwordHash, role: 'admin' });
  console.log(`Admin user created: ${env.ADMIN_EMAIL}`);
}
