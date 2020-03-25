
import Model from '../model';

export default Model.extend({
  tableName: 'answers_boolean',

  question: function() {
    return this.belongsTo('Question');
  },
  
  response: function() {
    return this.belongsTo('Response');
  },
})
