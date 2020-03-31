import Router from 'express';
const router = Router();
import { HTTPError } from '../errors';

import models from '../models';
import { knex } from '../bookshelf';

/**
 * @api {get} /v1/data/counts number of respondents
 *
 * @apiSuccess
 */
const process_count = async function(req, res, next) {
  try {
    let count = await knex('respondents').count('id as count');
    res.json(count[0]);
  } catch(err) {
    console.error(err);
    return new HTTPError(400);
  }
};


router.get('/', process_count);

export default router;
