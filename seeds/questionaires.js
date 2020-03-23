
import * as questions from '@symptotrack/questions';
import models from '../src/models';

// Unique value filter
const unique = function(value, index, array) {
  return array.indexOf(value) === index;
}

// Get question type strings from questionaires
const get_question_types = function(questionaires) {
  return Object
    .keys(questionaires)
    .flatMap(name => {
      let questionaire = questionaires[name].config;

      return Object.keys(questionaire.groups).flatMap(name => {
        let group = questionaire.groups[name];

        return Object.keys(group).map(name => {
          let question = group[name];
          return question.type;
        })
      })
    })
    .filter(unique);
}

exports.seed = function(knex) {
  // TODO - Add question types

  console.log();

  return Promise.all(Object.keys(questions.questionaires).map(async name => {
    // When questions seem to be changing, add questions as many to many to questionaire and
    // add a new questionaire revision with new questions
    let [questionaire, question_types] = await Promise.all([
      models.Questionaire.find_or_create({ name }),
      get_question_types(questions.questionaires).map(name => models.QuestionType.find_or_create({ name })),
    ]);

    // TODO - Add questions

    // TODO - Add question select option

  }))
};
