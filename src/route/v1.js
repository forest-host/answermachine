
import { questionaires } from '@symptotrack/questions';
import Router from 'express';

import responses_route from './responses';
import { NotFoundError } from '../errors';

const router = Router();

const load_questionaire = async function(req, res, next) {
  if(Object.keys(questionaires).indexOf(req.param.questionaire_name) === -1) {
    throw new NotFoundError();
  } else {
    req.questionaire = questionaires[req.param.questionaire_name].config;
    next();
  }
}

router.use('/responses/:questionaire_name(\w+)', load_questionaire, responses_route);

export default router;
