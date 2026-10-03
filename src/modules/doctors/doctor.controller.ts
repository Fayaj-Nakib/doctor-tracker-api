import type { RequestHandler } from 'express';
import { idParams } from '../../utils/query';
import * as patientService from '../patients/patient.service';
import { listPatientsQuery } from '../patients/patient.schema';
import { listDoctorsQuery } from './doctor.schema';
import * as doctorService from './doctor.service';

export const list: RequestHandler = async (req, res) => {
  res.json(await doctorService.listDoctors(listDoctorsQuery.parse(req.query)));
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json({ data: await doctorService.getDoctor(id) });
};

export const create: RequestHandler = async (req, res) => {
  res.status(201).json({ data: await doctorService.createDoctor(req.body) });
};

export const listPatients: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  await doctorService.assertDoctorExists(id);
  const query = listPatientsQuery.parse(req.query);
  res.json(await patientService.listPatients({ ...query, doctorId: id }));
};

export const addPatient: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.status(201).json({ data: await patientService.createPatient(id, req.body) });
};
