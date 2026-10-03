import { Router } from 'express';
import { z } from 'zod';
import { dateRangeError, optionalDate, validDateRange } from '../../utils/query';
import { getOverview } from './stats.service';

const overviewQuery = z
  .object({ from: optionalDate, to: optionalDate })
  .refine(validDateRange, dateRangeError);

export const statsRouter = Router();

statsRouter.get('/overview', async (req, res) => {
  const { from, to } = overviewQuery.parse(req.query);
  res.json({ data: await getOverview(from, to) });
});
