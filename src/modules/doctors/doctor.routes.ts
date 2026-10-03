import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import { createPatientSchema } from '../patients/patient.schema';
import * as controller from './doctor.controller';
import { createDoctorSchema } from './doctor.schema';

export const doctorRouter = Router();

doctorRouter.get('/', controller.list);
doctorRouter.post('/', validateBody(createDoctorSchema), controller.create);
doctorRouter.get('/:id', controller.getById);
doctorRouter.get('/:id/patients', controller.listPatients);
doctorRouter.post('/:id/patients', validateBody(createPatientSchema), controller.addPatient);
