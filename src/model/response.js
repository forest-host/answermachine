
import Model from '../model';
import { v4 as uuid } from 'uuid';

export default Model.extend({
  tableName: 'responses',

  respondent: function() {
    return this.belongsTo('Respondent');
  },

  questionaire: function() {
    return this.belongsTo('Questionaire');
  },
})
