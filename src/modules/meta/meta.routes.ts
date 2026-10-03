import { Router } from 'express';
import { DoctorModel, SPECIALIZATIONS } from '../../models/doctor.model';
import { CONDITIONS, GENDERS } from '../../models/patient.model';

export const metaRouter = Router();

/** Options for filter dropdowns and forms, so the UI never hard-codes them. */
metaRouter.get('/options', async (_req, res) => {
  const hospitals = await DoctorModel.distinct('hospital'); // served from the hospital index
  res.json({
    data: {
      specializations: SPECIALIZATIONS,
      conditions: CONDITIONS,
      genders: GENDERS,
      hospitals: hospitals.sort(),
    },
  });
});
