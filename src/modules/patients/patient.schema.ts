import { z } from 'zod';
import { CONDITIONS, GENDERS } from '../../models/patient.model';
import {
  dateRangeError,
  objectId,
  optionalDate,
  optionalEnum,
  optionalObjectId,
  optionalString,
  paginationQuery,
  sortQuery,
  validDateRange,
} from '../../utils/query';
import { phoneSchema } from '../doctors/doctor.schema';

const notInFuture = (date: Date) => date.getTime() <= Date.now();

// Base fields WITHOUT defaults, so PATCH (partial) never silently resets a field
const patientFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  dateOfBirth: z.coerce
    .date({ error: 'Enter a valid date of birth' })
    .refine(notInFuture, 'Date of birth cannot be in the future')
    .refine((d) => d.getFullYear() >= 1900, 'Enter a valid date of birth'),
  gender: z.enum(GENDERS, { error: 'Choose a gender' }),
  phone: phoneSchema,
  condition: z.enum(CONDITIONS, { error: 'Choose a condition' }),
  diagnosis: z.string().trim().max(200),
  admittedAt: z.coerce
    .date({ error: 'Enter a valid admission date' })
    .refine(notInFuture, 'Admission date cannot be in the future'),
};

export const createPatientSchema = z.object({
  ...patientFields,
  condition: patientFields.condition.default('stable'),
  diagnosis: patientFields.diagnosis.optional(),
  admittedAt: patientFields.admittedAt.optional(),
});

export const updatePatientSchema = z
  .object({ ...patientFields, doctor: objectId })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const listPatientsQuery = z
  .object({
    ...paginationQuery,
    search: optionalString(),
    condition: optionalEnum(CONDITIONS),
    gender: optionalEnum(GENDERS),
    doctorId: optionalObjectId,
    from: optionalDate,
    to: optionalDate,
    sort: sortQuery,
  })
  .refine(validDateRange, dateRangeError);

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuery>;
