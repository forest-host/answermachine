
import Router from 'express';
const router = Router();

import * as symptotrack from '@symptotrack/questions';
import { HTTPError } from '../errors';

import { knex } from '../bookshelf';
import models from '../models';

/**
 * Load questionaire from symptotrack config
 */
const load_questionaire = function(req, res, next) {
  if(symptotrack.get_questionaires().indexOf(req.params.questionaire_name) === -1) {
    return next(new HTTPError(404));
  } else {
    req.questionaire = symptotrack.get_questionaire(
      req.params.questionaire_name,
      // Get recurring questionaire when respondent id was submitted
      req.body.hasOwnProperty('respondent_id')
    );

    next();
  }
}

/**
 * Check if locale exists for questionaire
 */
const load_locale = async function(req, res, next) {
  if(symptotrack.get_questionaire_locales(req.params.questionaire_name).indexOf(req.body.locale) === -1) {
    return next(new HTTPError(400, 'Invalid locale'));
  } else {
    req.locale = await models.Locale.where({ code: req.body.locale }).fetch({ require: true });
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
    res.json(validation_error.questions);
  }
}

/**
 * Try to get respondent from response data, create a new one when this is first submission
 */
const load_or_create_respondent = async function(req, res, next) {
  if(typeof(req.body.respondent_uuid) !== 'undefined') {
    try {
      req.respondent = await models.Respondent.where('uuid', req.body.respondent_uuid).fetch({ require: true });
      req.recurring = true;
    } catch {
      return next(new Error('Invalid respondent_id'));
    }
  } else {
    let respondent = new models.Respondent();
    req.respondent = await respondent.save();
    req.recurring = false;
  }

  next();
}

const get_questionaire_with_last_revision = function (questionaire_name) {
  return models.Questionaire
    .query(knex => {
      knex
        .where('name', questionaire_name)
        .select('id')
        .max('revision')
        .groupBy('id')
    })
    .fetch({ 
      require: true,
      withRelated: ['questions', 'questions.question_options'],
    });
}

/**
 * Save a valid response to database
 */
const process_response = async function(req, res, next) {
    // Get latest questionaire revision
  let questionaire = await get_questionaire_with_last_revision(req.params.questionaire_name);

  // TODO - Try to load respondent or create one
  let response = await models.Response
    .forge({ 
      respondent_id: req.respondent.get('id'), 
      questionaire_id: questionaire.get('id'),
      locale_id: req.locale.get('id'), 
    })
    .save();

  let questions = symptotrack.get_questions(req.questionaire);
  
  // Get shared properties for all answer models
  let get_shared_properties = function(answer) {
    return {
      response_id: answer.response_id,
      question_id: answer.question.get('id'),
    };
  };

  // As a lot of models use 'value' column for answer value, share logic
  let value_inserter = function(model) {
    return function(data) {
      return knex(model.prototype.tableName).insert(data.map(answer => {
        return { ...get_shared_properties(answer), value: answer.value}
      }));
    }
  };
  
  // Inserters for every question type
  let answer_inserters = {
    // Insert all select
    select: function(data) {
      // Insert select answers
      return knex(models.AnswerSelect.prototype.tableName).insert(data.map(answer => {
        let option = answer.question.related('question_options').find({ attributes: { name: answer.value }});

        return { ...get_shared_properties(answer), question_option_id: option.get('id')}
      }));
    },
    multiselect: function(data) {
      // Multiselect uses same model as select, so just delegate to select inserter
      let answers = data.flatMap(answer => answer.value.map(option => {
        return { question: answer.question, response_id: answer.response_id, value: option }
      }));

      return answer_inserters.select(answers);
    },
    date: value_inserter(models.AnswerDate),
    boolean: value_inserter(models.AnswerBoolean),
    float: value_inserter(models.AnswerFloat),
    integer: value_inserter(models.AnswerInteger),
    text: value_inserter(models.AnswerString),
  };

  // Get question data for inserter from valid_data
  let get_question_data = function(question_name) {
    return {
      question: questionaire.related('questions').find({ attributes: { name: question_name } }),
      response_id: response.get('id'),
      value: req.valid_data[question_name],
    };
  }

  // Insert all non-"other" questions as their question type
  let promises = Object.keys(answer_inserters).map(question_type => {
    // Get data from req.valid data for each question type
    let data = Object.keys(questions)
      .filter(question_name => {
        let question = questions[question_name];

        return question.type == question_type 
          && req.valid_data.hasOwnProperty(question_name)
        // Handle "other" answers later and insert them as text
          && symptotrack.is_answer(question, req.valid_data[question_name])
      })
      .map(get_question_data);

    // Call inserter with data
    return answer_inserters[question_type](data)
  });

  // Insert all "other" questions as text input
  let other_questions_data = Object.keys(questions)
    .filter(question_name => {
      let question = questions[question_name];
      return req.valid_data.hasOwnProperty(question_name) && symptotrack.is_other_answer(question, req.valid_data[question_name]);
    })
    .map(get_question_data);

  promises.push(answer_inserters.text(other_questions_data));

  // Wait for all the inserts to finish
  await Promise.all(promises);

  // Send valid data to frontend
  res.json({ respondent_uuid: req.respondent.get('uuid'), questions: req.valid_data });
}

router.post('/:questionaire_name(\\w+)', load_questionaire, load_locale, validate_response, load_or_create_respondent, process_response);


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

