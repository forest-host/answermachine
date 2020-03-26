
import Model from '../model';

export default Model.extend({
  tableName: 'answers_coordinates',

  question: function() {
    return this.belongsTo('Question');
  },
  
  response: function() {
    return this.belongsTo('Response');
  },
})
