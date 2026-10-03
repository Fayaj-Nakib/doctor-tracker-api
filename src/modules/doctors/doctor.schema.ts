import { z } from 'zod';
import { SPECIALIZATIONS } from '../../models/doctor.model';
import {
  dateRangeError,
  optionalDate,
  optionalEnum,
  optionalString,
  paginationQuery,
  sortQuery,
  validDateRange,
} from '../../utils/query';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{6,18}$/, 'Enter a valid phone number');

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  specialization: z.enum(SPECIALIZATIONS, { error: 'Choose a specialization' }),
  hospital: z.string().trim().min(2, 'Hospital is required').max(120),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
});

export const listDoctorsQuery = z
  .object({
    ...paginationQuery,
    search: optionalString(),
    specialization: optionalEnum(SPECIALIZATIONS),
    hospital: optionalString(120),
    from: optionalDate,
    to: optionalDate,
    sort: sortQuery,
  })
  .refine(validDateRange, dateRangeError);

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuery>;
