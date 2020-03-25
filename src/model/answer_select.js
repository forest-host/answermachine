
import Model from '../model';

export default Model.extend({
  tableName: 'answers_select',

  question_option: function() {
    return this.belongsTo('QuestionOption');
  }
})
