/**
 * Prints how MongoDB executes the app's hottest queries (`npm run explain`).
 * Proof for the README that searches, filters and pagination use indexes:
 * look for IXSCAN (index scan) and docsExamined ≈ returned, never COLLSCAN or SORT.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { DoctorModel } from '../models/doctor.model';
import { PatientModel } from '../models/patient.model';
import { nameTokensFilter } from '../utils/search';

type PlanStage = {
  stage: string;
  indexName?: string;
  inputStage?: PlanStage;
  inputStages?: PlanStage[];
};

type ExplainOutput = {
  queryPlanner: { winningPlan: PlanStage & { queryPlan?: PlanStage } };
  executionStats: {
    nReturned: number;
    totalKeysExamined: number;
    totalDocsExamined: number;
    executionTimeMillis: number;
  };
};

/** Flattens the plan tree into "LIMIT <- FETCH <- IXSCAN(index)". */
function describe(plan: PlanStage): string {
  const children = [plan.inputStage, ...(plan.inputStages ?? [])].filter(
    (child): child is PlanStage => Boolean(child),
  );
  const self = plan.indexName ? `${plan.stage}(${plan.indexName})` : plan.stage;
  return children.length ? `${self} <- ${children.map(describe).join(' + ')}` : self;
}

async function main() {
  await connectDB();
  const busiestDoctor = await PatientModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);
  const doctorId = busiestDoctor[0]?._id;

  const page = { admittedAt: -1, _id: -1 } as const;
  const queries = [
    {
      name: 'Patients: newest first, page 1',
      run: () => PatientModel.find({}).sort(page).limit(10),
    },
    {
      name: 'Patients: condition = critical, newest first',
      run: () => PatientModel.find({ condition: 'critical' }).sort(page).limit(10),
    },
    {
      name: "One doctor's patients, newest first",
      run: () => PatientModel.find({ doctor: doctorId }).sort(page).limit(10),
    },
    {
      name: 'Patients: search "kha" (prefix on any name word)',
      run: () =>
        PatientModel.find({ nameTokens: nameTokensFilter('kha') })
          .sort(page)
          .limit(10),
    },
    {
      name: 'Doctors: specialization = Cardiology, newest first',
      run: () =>
        DoctorModel.find({ specialization: 'Cardiology' })
          .sort({ createdAt: -1, _id: -1 })
          .limit(10),
    },
  ];

  const rows = [];
  for (const query of queries) {
    const explain = (await query.run().explain('executionStats')) as unknown as ExplainOutput;
    const winning = explain.queryPlanner.winningPlan;
    const stats = explain.executionStats;
    rows.push({
      query: query.name,
      plan: describe(winning.queryPlan ?? winning),
      keysExamined: stats.totalKeysExamined,
      docsExamined: stats.totalDocsExamined,
      returned: stats.nReturned,
      ms: stats.executionTimeMillis,
    });
  }

  const total = await PatientModel.estimatedDocumentCount();
  console.log(`\nCollection size: ${total} patients\n`);
  for (const row of rows) {
    console.log(`• ${row.query}`);
    console.log(`  plan:     ${row.plan}`);
    console.log(
      `  examined: ${row.keysExamined} keys, ${row.docsExamined} docs -> returned ${row.returned} in ${row.ms} ms\n`,
    );
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('Explain failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
