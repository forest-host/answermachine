
import Router from 'express';
const router = Router();

import load_respondent from '../middleware/load_respondent';
import models from '../models';
import { knex } from '../bookshelf';

const process_recovery = async function(req, res, next) {
  await knex('recoveries').insert({ 
    respondent_id: req.respondent.get('id'),
    created_at: knex.raw('now()'),
    updated_at: knex.raw('now()'),
  });

  res.json({});
}

let uuid_regex = '[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}';
router.post(`/:respondent_uuid(${uuid_regex})`, load_respondent, process_recovery);

export default router;
