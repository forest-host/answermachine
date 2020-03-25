
import Model from '../model';

export default Model.extend({
  tableName: 'responses',

  respondent: function() {
    return this.belongsTo('Respondent');
  },

  questionaire: function() {
    return this.belongsTo('Questionaire');
  },
})
