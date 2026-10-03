import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  // Fail after 10s instead of hanging for 30s when the DB is unreachable
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log('MongoDB connected');
}