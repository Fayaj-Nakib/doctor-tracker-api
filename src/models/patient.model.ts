import { Schema, model, type InferSchemaType } from 'mongoose';

export const CONDITIONS = ['stable', 'recovering', 'critical', 'discharged'] as const;
export const GENDERS = ['male', 'female', 'other'] as const;

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameTokens: { type: [String], required: true, select: false },
    dateOfBirth: { type: Date, required: true }, // store DOB, derive age: age goes stale
    gender: { type: String, required: true, enum: GENDERS },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    condition: { type: String, required: true, enum: CONDITIONS, default: 'stable' },
    diagnosis: { type: String, trim: true, maxlength: 200 },
    // Reference, not embedded: see docs/adr/0003
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    admittedAt: { type: Date, required: true, default: Date.now }, // THE patient date
  },
  { timestamps: true },
);

// _id is the last key because every list sorts by { admittedAt, _id } (stable pagination):
// the index then returns rows already in order, so MongoDB never sorts in memory
patientSchema.index({ doctor: 1, admittedAt: -1, _id: -1 });
patientSchema.index({ condition: 1, admittedAt: -1, _id: -1 });
patientSchema.index({ admittedAt: -1, _id: -1 });
patientSchema.index({ nameTokens: 1 }); // prefix search on any word of the name

export type Patient = InferSchemaType<typeof patientSchema>;
export const PatientModel = model('Patient', patientSchema);
