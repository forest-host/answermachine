
import * as questions from '@symptotrack/questions';
import models from '../src/models';

const seed_questionaire = function(knex, questionaire, defaults) {
  console.log(questionaire, defaults);
}

exports.seed = function(knex) {
  return Promise.all(Object.keys(questions.questionaires).map(async name => {
    let questionaire = await new models.Questionaire({ name }).save();

    //return seed_questionaire(knex, questions.questionaires[name])
  }))
};
