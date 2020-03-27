import Router from 'express';
const router = Router();

import load_respondent from '../middleware/load_respondent';
import models from '../models';
import { knex } from '../bookshelf';

const process_confirmation = async function(req, res, next) {
  req.respondent.set('email_confirmed', true);
  await req.respondent.save();

  res.json({});
};

let uuid_regex = '[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}';
router.post(`/:respondent_uuid(${uuid_regex})`, load_respondent, process_confirmation);

export default router;
