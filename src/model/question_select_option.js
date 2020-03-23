
import Model from '../model';

export default Model.extend({
  tableName: 'question_select_options',

  question: function() {
    return this.belongsTo('Question');
  }
})
