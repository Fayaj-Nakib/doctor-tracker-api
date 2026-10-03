import type { Types } from 'mongoose';
import { DoctorModel } from '../../models/doctor.model';
import { PatientModel } from '../../models/patient.model';
import { dateRangeFilter } from '../../utils/query';

const TIMEZONE = 'Asia/Dhaka';
const OFFSET_MS = 6 * 60 * 60 * 1000; // Dhaka is UTC+6 all year (no DST)
const DAY = 86_400_000;

/** Midnight on the 1st of a month in Dhaka, `monthsBack` months ago, as a UTC Date. */
function dhakaMonthStart(monthsBack = 0) {
  const local = new Date(Date.now() + OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsBack, 1) - OFFSET_MS,
  );
}

type OverviewFacet = {
  totals: { total: number; critical: number; newThisMonth: number }[];
  byCondition: { condition: string; count: number }[];
  topDoctors: { doctorId: Types.ObjectId; name: string; specialization: string; count: number }[];
  overTime: { date: Date; count: number }[];
};

export async function getOverview(from?: Date, to?: Date) {
  const range = dateRangeFilter(from, to);

  // Time series: requested range, or the last 12 months by default.
  // Short ranges (<= 62 days) are bucketed by day, longer ones by month.
  const seriesFrom = from ?? dhakaMonthStart(11);
  const seriesTo = range?.$lt ?? new Date();
  const unit = seriesTo.getTime() - seriesFrom.getTime() <= 62 * DAY ? 'day' : 'month';

  const [totalDoctors, bySpecialization, [facet]] = await Promise.all([
    DoctorModel.estimatedDocumentCount(), // collection metadata: no scan
    DoctorModel.aggregate<{ specialization: string; count: number }>([
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, specialization: '$_id', count: 1 } },
    ]),
    PatientModel.aggregate<OverviewFacet>([
      // The only stage that can use an index; $facet sub-pipelines cannot
      ...(range ? [{ $match: { admittedAt: range } }] : []),
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                critical: { $sum: { $cond: [{ $eq: ['$condition', 'critical'] }, 1, 0] } },
                newThisMonth: {
                  $sum: { $cond: [{ $gte: ['$admittedAt', dhakaMonthStart(0)] }, 1, 0] },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
          byCondition: [
            { $group: { _id: '$condition', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, condition: '$_id', count: 1 } },
          ],
          // Group and limit FIRST, then look up names for only 10 doctors
          topDoctors: [
            { $group: { _id: '$doctor', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'doctors',
                localField: '_id',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, specialization: 1 } }],
                as: 'doctor',
              },
            },
            { $unwind: '$doctor' },
            {
              $project: {
                _id: 0,
                doctorId: '$_id',
                name: '$doctor.name',
                specialization: '$doctor.specialization',
                count: 1,
              },
            },
          ],
          overTime: [
            { $match: { admittedAt: { $gte: seriesFrom, $lt: seriesTo } } },
            {
              $group: {
                _id: { $dateTrunc: { date: '$admittedAt', unit, timezone: TIMEZONE } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } },
          ],
        },
      },
    ]),
  ]);

  const totals = facet?.totals[0] ?? { total: 0, critical: 0, newThisMonth: 0 };

  return {
    totalDoctors,
    totalPatients: totals.total,
    criticalPatients: totals.critical,
    newPatientsThisMonth: totals.newThisMonth,
    avgPatientsPerDoctor: totalDoctors ? Math.round((totals.total / totalDoctors) * 10) / 10 : 0,
    patientsByCondition: facet?.byCondition ?? [],
    topDoctors: facet?.topDoctors ?? [],
    doctorsBySpecialization: bySpecialization,
    patientsOverTime: { unit, points: facet?.overTime ?? [] },
  };
}
