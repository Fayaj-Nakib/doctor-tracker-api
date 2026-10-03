import type { Types } from 'mongoose';
import { DoctorModel } from '../../models/doctor.model';
import { PatientModel } from '../../models/patient.model';
import { ApiError } from '../../utils/ApiError';
import { buildMeta, dateRangeFilter, skipFor } from '../../utils/query';
import { escapeRegex, nameTokensFilter, tokenize } from '../../utils/search';
import type { CreateDoctorInput, ListDoctorsQuery } from './doctor.schema';

// _id as a tie-breaker keeps pagination stable when sort values are equal
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
} as const;

/** One grouped query for just the doctors on the current page (uses the doctor index). */
async function patientCountsFor(doctorIds: Types.ObjectId[]) {
  const rows = await PatientModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctor: { $in: doctorIds } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export async function listDoctors(query: ListDoctorsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    if (query.search.includes('@')) {
      filter.email = new RegExp(`^${escapeRegex(query.search.toLowerCase())}`);
    } else {
      const tokens = nameTokensFilter(query.search);
      if (tokens) filter.nameTokens = tokens;
    }
  }
  if (query.specialization) filter.specialization = query.specialization;
  if (query.hospital) filter.hospital = query.hospital;
  const range = dateRangeFilter(query.from, query.to);
  if (range) filter.createdAt = range;

  // Page and total count run in parallel: one round-trip of latency, not two
  const [doctors, total] = await Promise.all([
    DoctorModel.find(filter)
      .sort(SORTS[query.sort])
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean(),
    DoctorModel.countDocuments(filter),
  ]);

  const counts = await patientCountsFor(doctors.map((doctor) => doctor._id));

  return {
    data: doctors.map((doctor) => ({
      ...doctor,
      patientCount: counts.get(String(doctor._id)) ?? 0,
    })),
    meta: buildMeta(query.page, query.limit, total),
  };
}

export async function getDoctor(id: string) {
  const [doctor, patientCount] = await Promise.all([
    DoctorModel.findById(id).lean(),
    PatientModel.countDocuments({ doctor: id }),
  ]);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return { ...doctor, patientCount };
}

export async function createDoctor(input: CreateDoctorInput) {
  const created = await DoctorModel.create({ ...input, nameTokens: tokenize(input.name) });
  return getDoctor(String(created._id));
}

export async function assertDoctorExists(id: string) {
  const exists = await DoctorModel.exists({ _id: id });
  if (!exists) throw ApiError.notFound('Doctor not found');
}
