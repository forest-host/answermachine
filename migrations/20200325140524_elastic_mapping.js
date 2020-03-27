
import config from '../lib/config';
import { Client } from '@elastic/elasticsearch';
import * as symptotrack from '@symptotrack/questions';

const questionaire = symptotrack.get_questionaire('basic');
const questions = symptotrack.get_questions(questionaire);

const mappings = Object.keys(questions)
  .filter(question_name => questions[question_name].hasOwnProperty('filter'))
  .reduce((agg, question_name) => {
    return { ...agg, [question_name]: { type: questions[question_name].type } };
  }, {});

exports.up = async function(knex) {
  console.log(config.elastic);

  const elastic = new Client({ node: config.elastic.node });

  await elastic.indices.create({
    index: config.elastic.index,
    body: {
      mappings: {
        properties: { ...config.elastic.mapping, ...mappings },
      }
    }
  });
};

exports.down = function(knex) {
  console.log("dont be down");
};
