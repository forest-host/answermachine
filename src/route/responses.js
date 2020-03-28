
import Router from 'express';
const router = Router();

import * as symptotrack from '@symptotrack/questions';
import { HTTPError } from '../errors';

import { knex as knex } from '../bookshelf';
import models from '../models';
import load_respondent from '../middleware/load_respondent';

import config from '../config';
import { Client } from '@elastic/elasticsearch';

import email_subjects from '../../emails/confirm/subjects.json';
import fs from 'fs';
import dot from 'dot';
import nodemailer from 'nodemailer';

/**
 * Load questionaire from symptotrack config
 */
const load_questionaire = function(req, res, next) {
  if(symptotrack.get_questionaires().indexOf(req.params.questionaire_name) === -1) {
    return next(new HTTPError(404));
  } else {
    req.is_recurring_questionaire = req.body.hasOwnProperty('respondent_uuid');
    req.questionaire = symptotrack.get_questionaire(
      req.params.questionaire_name,
      // Get recurring questionaire when respondent id was submitted
      req.is_recurring_questionaire,
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
    } catch {
      return next(new Error('Invalid respondent_id'));
    }
  } else {
    let respondent = new models.Respondent();
    req.respondent = await respondent.save();
  }

  next();
}

/**
 * Get latest filled in questionaire
 */
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

  // Create response for respondent
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
    return { response_id: answer.response_id, question_id: answer.question.get('id'), };
  };

  // As a lot of models use 'value' column for answer value, share logic
  let value_inserter = function(model) {
    return function(data) {
      return knex(model.prototype.tableName).insert(data.map(answer => {
        return { ...get_shared_properties(answer), value: answer.value };
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
    coordinates: function(data) {
      return knex(models.AnswerCoordinates.prototype.tableName).insert(data.map(answer => {
        return { ...get_shared_properties(answer), latitude: answer.value[0], longitude: answer.value[1] }
      }))
    },
    // These all have 'value' column, so we can use the same logic
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

  // Add response to request so we can use it for elastic
  req.response = response;
  next();
}

/**
 * Send email confirmation email
 */
const send_mail = async function(req, res, next) {
  // Only send mail on first questionaire
  if(!req.is_recurring_questionaire) {
    next();
  }

  if(typeof email_subjects[req.body.locale] == 'undefined') {
    // No locale email subject, and thus template, found
    next();
  }

  let template = dot.template(fs.readFileSync(__dirname + '/../../emails/confirm/' + req.body.locale + '.dot').toString());
  let link = config.email.confirmlink + '?token=' + req.respondent.get('uuid') + '&locale=' + req.body.locale + '&email=' + req.body.email;

  try {
    let transporter = nodemailer.createTransport({ sendmail: true });

    await transporter.sendMail({
      from: config.email.from,
      to: req.body.email,
      replyTo: config.email.reply_to,
      subject: email_subjects[req.body.locale],
      html: template({ ...config.email, link })
    });
  } catch(err) {
    console.error(err);
  }

  next();
};

const update_elastic = function(req, res, next) {
  if(req.valid_data.hasOwnProperty('coordinates')) {
    next();
  }

  let questions = symptotrack.get_questions(req.questionaire);
  let filters = Object.keys(questions)
    .filter(question_name => questions[question_name].hasOwnProperty('filter'))
    .reduce((agg, question_name) => {
      return { ...agg, [question_name]: req.valid_data[question_name] };
    }, {});

  const elastic = new Client({ node: config.elastic.node });

  elastic.update({
    index: config.elastic.index,
    id: req.respondent.get('id'), // @TODO better use Elastic IDs (they index faster)
    body: {
      doc: {
        created_at: req.response.get('created_at'),
        updated_at: req.response.get('updated_at'),
        location: req.valid_data.coordinates,
        ...filters
      },
      doc_as_upsert: true
    }
  }).catch( err => { console.error(err.body.error); });

  next();
};


const return_response = function(req, res, next) {
  // Send valid data to frontend
  res.json({ respondent_uuid: req.respondent.get('uuid'), questions: req.valid_data });
};

router.post('/:questionaire_name(\\w+)', 
  load_questionaire,
  load_locale,
  validate_response,
  load_or_create_respondent,
  process_response, 
  send_mail,
  update_elastic,
  return_response
);

/**
 * Get answers to previously filled in questionaires
 */
const get_responses = async function(req, res, next) {
  const joiner = function(table) {
    return function() {
      this
        .on('questions.id', `${table}.question_id`)
        .on('responses.id', `${table}.response_id`);
    }
  }

  // Get answers for last response respondent submitted
  let answers = await knex('questions')
    .join('questionaires_questions', 'questions.id', 'questionaires_questions.question_id')

    // Only get questions of submitted questionaire
    .join('questionaires', 'questionaires_questions.questionaire_id', 'questionaires.id')
    .where('questionaires.name', req.params.questionaire_name)
    .select('questions.id', 'questions.name')
    .groupBy('questions.id')

    // Get last response of respondent when multiple responses submitted
    .join('responses', 'questionaires.id', 'responses.questionaire_id')
    .where('responses.respondent_id', req.respondent.get('id'))
    .max('responses.created_at')
    .groupBy('responses.id')

    // Join answers to questions
    .leftOuterJoin('answers_select', joiner('answers_select'))
    .leftOuterJoin('question_options', 'answers_select.question_option_id', 'question_options.id')
    .select(knex.raw('group_concat(question_options.name) as value_select'))
    .leftOuterJoin('answers_integer', joiner('answers_integer'))
    .select('answers_integer.value as value_integer')
    .leftOuterJoin('answers_float', joiner('answers_float'))
    .select('answers_float.value as value_float')
    .leftOuterJoin('answers_date', joiner('answers_date'))
    .select('answers_date.value as value_date')
    .leftOuterJoin('answers_string', joiner('answers_string'))
    .select('answers_string.value as value_text')
    .leftOuterJoin('answers_boolean', joiner('answers_boolean'))
    .select('answers_boolean.value as value_boolean')
    .leftOuterJoin('answers_coordinates', joiner('answers_coordinates'))
    .select(knex.raw('concat(answers_coordinates.latitude, ", ", answers_coordinates.longitude) as value_coordinates'))


  let questions = symptotrack.get_questions(req.questionaire);

  // Create json blob from query data
  let data = answers.reduce((data, answer) => {
    let question = questions[answer.name];

    // Get correct value from answer
    let value_tag = `value_${question.type}`;
    if(question.type == 'multiselect') {
      value_tag = 'value_select';
    }

    // Check answer type
    let is_question_type_answer = answer.hasOwnProperty(value_tag) && answer[value_tag] !== null;
    let is_string_answer = answer['value_text'] !== null;

    let value = null;

    // Get value from answer
    if(is_question_type_answer) {
      value = answer[value_tag];

      // convert to array
      if(question.type == 'multiselect') {
        value = value.split(',');
      }
      // convert to bool
      if(question.type == 'boolean') {
        value = !! value;
      }
      // Convert to coord array
      if(question.type == 'coordinates') {
        value = value.split(',').map(parseFloat);
      }
    }
    // Could be this is overridden "other" answer
    if(is_string_answer) {
      value = answer['value_text'];
    }

    // Return aggregate
    if(value !== null) {
      return { ...data, [answer.name]: value }
    }
    return data;
  }, {});

  // Return data to frontend
  res.json(data);
}

let uuid_regex = '[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}';
router.get(`/:questionaire_name(\\w+)/:respondent_uuid(${uuid_regex})`, load_questionaire, load_respondent, get_responses);

export default router;

