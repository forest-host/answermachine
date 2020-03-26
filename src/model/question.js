
import Model from '../model';

export default Model.extend({
  tableName: 'questions',

  questionaires: function() {
    return this.belongsToMany('Questionaire', 'questionaires_questions');
  },

  question_type: function() {
    return this.belongsTo('QuestionType');
  },

  question_options: function() {
    return this.hasMany('QuestionOption');
  },

  answers_select: function() {
    return this.hasMany('AnswerSelect');
  },

  answers_float: function() {
    return this.hasMany('AnswerFloat');
  },

  answers_integer: function() {
    return this.hasMany('AnswerInteger');
  },

  answers_string: function() {
    return this.hasMany('AnswerString');
  },

  answers_date: function() {
    return this.hasMany('AnswerDate');
  },

  answers_boolean: function() {
    return this.hasMany('AnswerDate');
  },
})
