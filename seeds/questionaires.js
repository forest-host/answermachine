
import * as symptotrack from '@symptotrack/questions';
import { knex, bookshelf } from '../lib/bookshelf';
import models from '../lib/models';

const find_or_create_question_types = async function(question_types_data) {
  let question_types = await Promise.all(question_types_data.map(name => models.QuestionType.find_or_create({ name })));
  return new bookshelf.Collection(question_types);
}

const find_or_create_locales = function(locales_data) {
  return Promise.all(locales_data.map(code => {
    return models.Locale.forge({ code }).save();
  }));
}

exports.seed = async function(knex) {
  let [question_types, locales] = await Promise.all([
    find_or_create_question_types(symptotrack.get_question_types()),
    find_or_create_locales(symptotrack.get_locales()),
  ]);

  return Promise.all(symptotrack.get_questionaires().map(async name => {
    // When questions seem to be changing, add questions as many to many to questionaire and
    // add a new questionaire revision with new questions
    let questionaire_data = symptotrack.get_questionaire(name);

    let questions_data = symptotrack.get_questions(questionaire_data);

    // TODO - Compare questions in DB with questions in JSON, increment revision when differences occur
    let questionaire = await models.Questionaire.find_or_create({ name, revision: 0 });

    let questions = await Promise.all(Object.keys(questions_data).map(async name => {
      // Create question model
      let question_data = questions_data[name];
      let question_type = question_types.find({ attributes: { name: question_data.type }});

      let question = await models.Question.find_or_create({ name, question_type_id: question_type.get('id') });

      // Add question select option for selects
      if(['select', 'multiselect'].indexOf(question_data.type) !== -1) {
        // Create question option models
        await Promise.all(question_data.options.map(name => {
          return models.QuestionOption.find_or_create({ name, question_id: question.get('id') });
        }));
      }

      return question;
    }));
  
    // Add questions to questionaire
    return Promise.all(questions.map(async question => {
      let data = {
        questionaire_id: questionaire.get('id'),
        question_id: question.get('id'),
      };

      let existing = await knex('questionaires_questions').where(data);
      if( ! existing.length) {
        return knex('questionaires_questions').insert(data);
      }
    }))
  }));
};
