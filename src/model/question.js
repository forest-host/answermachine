
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
})
