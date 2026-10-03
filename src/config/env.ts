import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(86400), // seconds
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;
