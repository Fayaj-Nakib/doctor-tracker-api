import { Schema, model, type InferSchemaType } from 'mongoose';

export const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'ENT',
  'Gastroenterology',
  'General Medicine',
  'Gynecology',
  'Nephrology',
  'Neurology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
] as const;

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameTokens: { type: [String], required: true, select: false }, // internal: search only
    specialization: { type: String, required: true, enum: SPECIALIZATIONS },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  },
  { timestamps: true },
);

// Each index matches a real query pattern (filter fields first, sort field last)
doctorSchema.index({ createdAt: -1 }); // default list sort + date filter
doctorSchema.index({ specialization: 1, createdAt: -1 }); // filter by specialization, newest first
doctorSchema.index({ hospital: 1, createdAt: -1 }); // filter by hospital, newest first
doctorSchema.index({ nameTokens: 1 }); // prefix search on any word of the name

export type Doctor = InferSchemaType<typeof doctorSchema>;
export const DoctorModel = model('Doctor', doctorSchema);
