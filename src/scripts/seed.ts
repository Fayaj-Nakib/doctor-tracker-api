import { faker } from '@faker-js/faker';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../config/db';
import { DoctorModel, SPECIALIZATIONS } from '../models/doctor.model';
import { GENDERS, PatientModel } from '../models/patient.model';
import { tokenize } from '../utils/search';

const DOCTOR_COUNT = 60;
const PATIENT_COUNT = 5000;
const BATCH_SIZE = 1000;
const DAY = 86_400_000;
const now = Date.now();
const yearAgo = now - 365 * DAY;

faker.seed(2026); // same data on every run: reproducible demos and screenshots

const FIRST_NAMES = [
  'Rahim',
  'Karim',
  'Fatema',
  'Ayesha',
  'Tanvir',
  'Nusrat',
  'Sadia',
  'Imran',
  'Farhana',
  'Arif',
  'Mahmud',
  'Sharmin',
  'Rafiq',
  'Nadia',
  'Hasan',
  'Tasnim',
  'Sabbir',
  'Rumana',
  'Zahid',
  'Mehjabin',
  'Shafiq',
  'Lamia',
  'Jubayer',
  'Afsana',
];
const LAST_NAMES = [
  'Ahmed',
  'Hossain',
  'Rahman',
  'Islam',
  'Chowdhury',
  'Khan',
  'Akter',
  'Siddique',
  'Talukder',
  'Sarker',
  'Uddin',
  'Haque',
  'Karim',
  'Alam',
  'Kabir',
  'Bhuiyan',
];
const HOSPITALS = [
  'Square Hospital',
  'Evercare Hospital Dhaka',
  'United Hospital',
  'Labaid Specialized Hospital',
  'Ibn Sina Hospital',
  'Popular Medical Centre',
  'BIRDEM General Hospital',
  'Dhaka Medical College Hospital',
  'Green Life Medical College Hospital',
  'Anwer Khan Modern Hospital',
];
const DIAGNOSES = [
  'Hypertension',
  'Type 2 diabetes',
  'Asthma',
  'Migraine',
  'Fracture',
  'Pneumonia',
  'Dengue fever',
  'Gastritis',
  'Chronic kidney disease',
  'Anemia',
  'Arthritis',
  'Thyroid disorder',
  'Bronchitis',
  'Skin allergy',
  'Coronary artery disease',
];

const fullName = () =>
  `${faker.helpers.arrayElement(FIRST_NAMES)} ${faker.helpers.arrayElement(LAST_NAMES)}`;

const bdPhone = () =>
  `+8801${faker.helpers.arrayElement(['3', '5', '6', '7', '8', '9'])}${faker.string.numeric(8)}`;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '.');

/** Biased towards recent dates, so charts show growth instead of flat noise. */
function recentBiasedDate(fromMs: number): Date {
  const r = 1 - faker.number.float({ min: 0, max: 1 }) ** 2;
  return new Date(fromMs + (now - fromMs) * r);
}

async function main() {
  await connectDB();

  console.log('Clearing doctors and patients (users are kept)...');
  await Promise.all([DoctorModel.deleteMany({}), PatientModel.deleteMany({})]);
  await Promise.all([DoctorModel.syncIndexes(), PatientModel.syncIndexes()]);

  const doctors = Array.from({ length: DOCTOR_COUNT }, (_, i) => {
    const name = fullName();
    const createdAt = new Date(yearAgo + faker.number.int({ min: 0, max: 300 }) * DAY);
    return {
      _id: new Types.ObjectId(),
      name,
      nameTokens: tokenize(name),
      specialization: faker.helpers.arrayElement(SPECIALIZATIONS),
      hospital: faker.helpers.arrayElement(HOSPITALS),
      phone: bdPhone(),
      email: `${slug(name)}.${i + 1}@doctortracker.example`,
      createdAt,
      updatedAt: createdAt,
      __v: 0,
    };
  });

  // Raw driver insert: Mongoose would overwrite the back-dated createdAt with "now"
  await DoctorModel.collection.insertMany(doctors);

  // A few busy doctors and a long tail: makes "patients per doctor" meaningful
  const weightedDoctors = doctors.map((doctor) => ({
    value: doctor,
    weight: faker.number.float({ min: 0.2, max: 1 }) ** 3,
  }));

  const patients = Array.from({ length: PATIENT_COUNT }, () => {
    const doctor = faker.helpers.weightedArrayElement(weightedDoctors);
    const name = fullName();
    const admittedAt = recentBiasedDate(doctor.createdAt.getTime());
    return {
      _id: new Types.ObjectId(),
      name,
      nameTokens: tokenize(name),
      dateOfBirth: faker.date.birthdate({ mode: 'age', min: 2, max: 90 }),
      gender: faker.helpers.arrayElement(GENDERS),
      phone: bdPhone(),
      condition: faker.helpers.weightedArrayElement([
        { value: 'stable', weight: 45 },
        { value: 'recovering', weight: 30 },
        { value: 'critical', weight: 10 },
        { value: 'discharged', weight: 15 },
      ]),
      diagnosis: faker.helpers.arrayElement(DIAGNOSES),
      doctor: doctor._id,
      admittedAt,
      createdAt: admittedAt,
      updatedAt: admittedAt,
      __v: 0,
    };
  });

  for (let i = 0; i < patients.length; i += BATCH_SIZE) {
    await PatientModel.collection.insertMany(patients.slice(i, i + BATCH_SIZE));
  }

  console.log(`Seeded ${doctors.length} doctors and ${patients.length} patients.`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
