
import Model from '../model';

export default Model.extend({
  tableName: 'answers_integer',

  question: function() {
    return this.belongsTo('Question');
  },
  
  response: function() {
    return this.belongsTo('Response');
  },
})
