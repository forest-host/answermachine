
import Model from '../model';

export default Model.extend({
  tableName: 'answers_date',

  question: function() {
    return this.belongsTo('Question');
  },
  
  response: function() {
    return this.belongsTo('Response');
  },
})
