
import Router from 'express';
const router = Router();

import load_respondent from '../middleware/load_respondent';
import models from '../models';
import { knex } from '../bookshelf';

import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';

const process_recovery = async function(req, res, next) {
  await knex('recoveries').insert({
    respondent_id: req.respondent.get('id'),
    created_at: knex.raw('now()'),
    updated_at: knex.raw('now()'),
  });

  next();
}

const update_elastic = function(req, res, next) {
  const elastic = new Client({ node: config.node });

  elastic.update({
    index: config.index,
    id: req.respondent.get('id'), // @TODO better use Elastic IDs (they index faster)
    body: {
      doc: {
        recovered_at: new Date()
      },
      doc_as_upsert: true
    }
  }).catch( err => { console.error(err.body.error); });

  next();
};

const return_recovery = function(req, res, next) {
  res.json({});
};


let uuid_regex = '[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}';
router.post(`/:respondent_uuid(${uuid_regex})`, load_respondent, process_recovery, update_elastic, return_recovery);

export default router;
