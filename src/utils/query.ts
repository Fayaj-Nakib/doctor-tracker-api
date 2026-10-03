import { z } from 'zod';

const DAY = 86_400_000;

/** Query strings send "" for cleared inputs: treat that as "not provided". */
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

export const optionalString = (max = 100) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

export const optionalEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndefined, z.enum(values).optional());

export const optionalObjectId = z.preprocess(emptyToUndefined, objectId.optional());

export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const sortQuery = z.preprocess(
  emptyToUndefined,
  z.enum(['newest', 'oldest', 'name']).default('newest'),
);

/** Rejects ranges where "from" is after "to". */
export const validDateRange = <T extends { from?: Date; to?: Date }>(value: T) =>
  !value.from || !value.to || value.from <= value.to;
export const dateRangeError = { message: '"from" must be on or before "to"', path: ['from'] };

/** "to" is inclusive of the whole day: ?to=2026-10-04 includes everything on Oct 4. */
export function dateRangeFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  const range: { $gte?: Date; $lt?: Date } = {};
  if (from) range.$gte = from;
  if (to) range.$lt = new Date(to.getTime() + DAY);
  return range;
}

export function buildMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export const skipFor = (page: number, limit: number) => (page - 1) * limit;
