
import Router from 'express';
const router = Router();

import * as symptotrack from '@symptotrack/questions';
import { HTTPError } from '../errors';

// Add questionaire config to request object
const load_questionaire = async function(req, res, next) {
  if(symptotrack.get_questionaires().indexOf(req.params.questionaire_name) === -1) {
    next(new HTTPError(404));
  } else {
    req.questionaire = symptotrack.get_questionaire(req.params.questionaire_name);
    next();
  }
}

const validate_response = function(req, res, next) {
  console.log(req.questionaire);
  next();
}

const process_response = function(req, res, next) {
  res.json({ hi: 'there' })
}

router.post('/:questionaire_name(\\w+)', load_questionaire, validate_response, process_response);

export default router;
