import type { RequestHandler } from 'express';
import { idParams } from '../../utils/query';
import { listPatientsQuery } from './patient.schema';
import * as patientService from './patient.service';

export const list: RequestHandler = async (req, res) => {
  res.json(await patientService.listPatients(listPatientsQuery.parse(req.query)));
};

export const getById: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json({ data: await patientService.getPatient(id) });
};

export const update: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json({ data: await patientService.updatePatient(id, req.body) });
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  await patientService.deletePatient(id);
  res.status(204).end();
};
