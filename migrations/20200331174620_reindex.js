import config from '../lib/config';
import { Client } from '@elastic/elasticsearch';
import * as symptotrack from '@symptotrack/questions';

const questionaire = symptotrack.get_questionaire('basic');
const questions = symptotrack.get_questions(questionaire);

exports.up = async function(knex) {
  const elastic = new Client({ node: config.elastic.node });

  // Clear Elastic index
  await elastic.deleteByQuery({
    index: config.elastic.index,
    conflicts: 'proceed',
    body: {
      query: {
        match_all: {}
      }
    }
  }).catch(err => { console.error(err); });

  const joiner = function(table) {
    return function() {
      this
        .on('questions.id', `${table}.question_id`)
        .on('responses.id', `${table}.response_id`);
    }
  }

  const group_by_respondents = array => array.reduce((responses, answer) => {
    let obj = {
      [answer.name]: (answer.value_coordinates) ? { lat: answer.value_coordinates.split(',')[0], lon: answer.value_coordinates.split(',')[1] } : Boolean(answer.value_boolean),
      created_at: answer.created_at,
      updated_at: answer.updated_at
    };
    return {
      ...responses,
      [answer.respondent_id]: { ...(responses[answer.respondent_id] || {}), ...obj },
    };
  }, {});


  let answers = await knex('questions')
    .join('questionaires_questions', 'questions.id', 'questionaires_questions.question_id')
    .whereIn('questions.name', ['location', 'fever', 'fatigue', 'dry_cough'])

    // Only get questions of submitted questionaire on questionaire name
    .join('questionaires', 'questionaires_questions.questionaire_id', 'questionaires.id')
    .where('questionaires.name', 'basic')
    .select('questions.id', 'questions.name')
    .groupBy('questions.id')

    // Get first response of respondent when multiple responses submitted
    .join('responses', 'questionaires.id', 'responses.questionaire_id')
    .max('responses.created_at')
    .groupBy('responses.id')
    .select('responses.respondent_id', 'responses.created_at', 'responses.updated_at')

    // Join answers to questions
    .leftOuterJoin('answers_boolean', joiner('answers_boolean'))
    .select('answers_boolean.value as value_boolean')
    .leftOuterJoin('answers_coordinates', joiner('answers_coordinates'))
    .select(knex.raw('concat(answers_coordinates.latitude, ", ", answers_coordinates.longitude) as value_coordinates'));

  // Bring back some structure
  // Group on respondent_id
  let responses = group_by_respondents(answers);

  let body = Object.keys(responses).reduce((res, key) => {
    // Remove responses without location
    if(responses[key].location == false)
      return res;

    // Add ID and index
    return [
      ...res,
      { index: { _index: config.elastic.index, _id: key } },
      { ...responses[key] }
    ]
  }, []);


  let recoveries = await knex('recoveries');

  body = body.concat(recoveries.reduce((res, item) => {
    return [
      ...res,
      { index: { _index: config.elastic.index, _id: item.respondent_id } },
      {
        tired: false,
        fatigue: false,
        dry_cough: false,
        recovered: true,
        updated_at: item.updated_at,
        recovered_at: item.created_at
      }
    ]
  }, []));

  // Update Elastic
  try {
    let res = await elastic.bulk({
      body: body
    });
    console.error(...res.body.items.reduce((t,i) => {
      i.response = responses[i._id];
      return (typeof i.index.error != 'undefined') ? [...t, i] : t;
    }, []));
  } catch(err) {
    console.error(err.body.error);
  }
};

exports.down = function(knex) {
  
};
