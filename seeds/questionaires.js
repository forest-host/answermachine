
import { questionaires, defaults } from '@symptotrack/questions';
import { knex, bookshelf } from '../src/bookshelf';
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

const find_or_create_question_types = async function(question_types_data) {
  let question_types = await Promise.all(question_types_data.map(name => models.QuestionType.find_or_create({ name })));
  return new bookshelf.Collection(question_types);
}

exports.seed = async function(knex) {
  let question_types = await find_or_create_question_types(get_question_types(questionaires));

  return Promise.all(Object.keys(questionaires).map(async name => {
    // When questions seem to be changing, add questions as many to many to questionaire and
    // add a new questionaire revision with new questions
    let questionaire_data = questionaires[name];

    let questions_data = Object.keys(questionaire_data.config.groups).reduce((aggregate, name) => {
      return Object.assign(aggregate, questionaire_data.config.groups[name]);
    }, {});

    // TODO - Compare questions in DB with questions in JSON, increment revision when differences occur
    let questionaire = await models.Questionaire.find_or_create({ name, revision: 0 });

    let questions = await Promise.all(Object.keys(questions_data).map(async name => {
      // Create question model
      let question_data = questions_data[name];
      let question_type = question_types.find({ attributes: { name: question_data.type }});

      let question = await models.Question.find_or_create({ name, question_type_id: question_type.get('id') });

      // Add question select option for selects
      if(['select', 'multiselect'].indexOf(question_data.type) !== -1) {
        // Try to get oprions from question_data
        let options = question_data.options;

        // Could be we have to get the options from defaults
        if( ! options) {
          if( ! question_data.variant) {
            options = defaults.config[question_data.type].options;
          } else {
            options = defaults.config[question_data.type].variants[question_data.variant].options;
          }
        }

        // Create question option models
        await Promise.all(options.map(name => {
          return models.QuestionSelectOption.find_or_create({ name, question_id: question.get('id') });
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
