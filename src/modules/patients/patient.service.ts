import { Types } from 'mongoose';
import { PatientModel } from '../../models/patient.model';
import { ApiError } from '../../utils/ApiError';
import { buildMeta, dateRangeFilter, skipFor } from '../../utils/query';
import { nameTokensFilter, tokenize } from '../../utils/search';
import { assertDoctorExists } from '../doctors/doctor.service';
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from './patient.schema';

const SORTS = {
  newest: { admittedAt: -1, _id: -1 },
  oldest: { admittedAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
} as const;

// Only the doctor fields the UI shows; populate runs one $in query for the whole page
const DOCTOR_FIELDS = 'name specialization hospital';

export async function listPatients(query: ListPatientsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    const tokens = nameTokensFilter(query.search);
    if (tokens) filter.nameTokens = tokens;
  }
  if (query.condition) filter.condition = query.condition;
  if (query.gender) filter.gender = query.gender;
  if (query.doctorId) filter.doctor = new Types.ObjectId(query.doctorId);
  const range = dateRangeFilter(query.from, query.to);
  if (range) filter.admittedAt = range;

  const [patients, total] = await Promise.all([
    PatientModel.find(filter)
      .sort(SORTS[query.sort])
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .populate('doctor', DOCTOR_FIELDS)
      .lean(),
    PatientModel.countDocuments(filter),
  ]);

  return { data: patients, meta: buildMeta(query.page, query.limit, total) };
}

export async function getPatient(id: string) {
  const patient = await PatientModel.findById(id).populate('doctor', DOCTOR_FIELDS).lean();
  if (!patient) throw ApiError.notFound('Patient not found');
  return patient;
}

export async function createPatient(doctorId: string, input: CreatePatientInput) {
  await assertDoctorExists(doctorId);
  const created = await PatientModel.create({
    ...input,
    nameTokens: tokenize(input.name),
    doctor: doctorId,
  });
  return getPatient(String(created._id));
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  if (input.doctor) await assertDoctorExists(input.doctor);

  const update = { ...input, ...(input.name && { nameTokens: tokenize(input.name) }) };
  const patient = await PatientModel.findByIdAndUpdate(id, update, {
    returnDocument: 'after',
    runValidators: true,
  })
    .populate('doctor', DOCTOR_FIELDS)
    .lean();

  if (!patient) throw ApiError.notFound('Patient not found');
  return patient;
}

export async function deletePatient(id: string) {
  const deleted = await PatientModel.findByIdAndDelete(id);
  if (!deleted) throw ApiError.notFound('Patient not found');
}
