import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import * as controller from './patient.controller';
import { updatePatientSchema } from './patient.schema';

export const patientRouter = Router();

patientRouter.get('/', controller.list);
patientRouter.get('/:id', controller.getById);
patientRouter.patch('/:id', validateBody(updatePatientSchema), controller.update);
patientRouter.delete('/:id', controller.remove);
