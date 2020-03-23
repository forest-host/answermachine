
import Model from '../model';

export default Model.extend({
  tableName: 'questionaires',

  questions: function() {
    return this.belongsToMany('Question', 'questionaires_questions');
  },
})
