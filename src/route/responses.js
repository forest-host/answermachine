
import Router from 'express';
const router = Router();

import * as symptotrack from '@symptotrack/questions';
import { HTTPError } from '../errors';

import models from '../models';

/**
 * Load questionaire from symptotrack config
 */
const load_questionaire = async function(req, res, next) {
  if(symptotrack.get_questionaires().indexOf(req.params.questionaire_name) === -1) {
    return next(new HTTPError(404));
  } else {
    req.questionaire = symptotrack.get_questionaire(req.params.questionaire_name);
    next();
  }
}

/**
 * Check if locale exists for questionaire
 */
const load_locale = async function(req, res, next) {
  if(symptotrack.get_questionaire_locales(req.params.questionaire_name).indexOf(req.body.locale) === -1) {
    return next(new HTTPError(404));
  } else {
    req.locale = await models.Locale.where({ name: req.body.locale }).fetch({ require: true });
    next();
  }
}

/**
 * Validate response data submitted by frontend
 */
const validate_response = function(req, res, next) {
  try {
    req.valid_data = symptotrack.validate(req.questionaire, req.body);
    next();
  } catch(validation_error) {
    res.status(400);
    res.json(validation_error.fields);
  }
}

/**
 * Try to get respondent from response data, create a new one when this is first submission
 */
const get_respondent = function(respondent_uuid) {
  if(typeof(respondent_uuid) !== 'undefined') {
    return models.Respondent.where('uuid', respondent_uuid).fetch({ require: true });
  } else {
    let respondent = new models.Respondent();
    return respondent.save()
  }
}

/**
 * Save a valid response to database
 */
const process_response = async function(req, res, next) {
  // TODO - Try to load respondent or create one
  try {
    let respondent = await get_respondent(req.body.respondent_uuid)
  } catch(err) {
    console.log(err);
    next(new Error('Invalid respondent_uuid'))
  }

  res.json({ hi: 'there' })
}

router.post('/:questionaire_name(\\w+)', load_questionaire, load_locale, validate_response, process_response);


/**
 * Load respondent when requesting previous submissions
 */
const load_respondent = async function(req, res, next) {
  try {
    // Add respondent to request
    req.respondent = models.Respondent.where({ uuid: req.params.respondent_uuid }).fetch({ require: true })
  } catch(err) {
    next(new HTTPError(404));
  }
}

/**
 * Get answers to previously filled in questionaires
 */
const questionaires = function(req, res, next) {
  // TODO - use req.respondent to get previous answers
  res.json({ 
    questionaires: {
      basic: {},
      extended: {},
    },
  })
}

let uuid_regex = '[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}';
router.get(`/:respondent_uuid(${uuid_regex})`, load_respondent, questionaires);

export default router;

