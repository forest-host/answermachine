
import Model from '../model';

export default Model.extend({
  tableName: 'recoveries',
  hasTimestamps: true,

  respondent: function() {
    return this.belongsTo('Respondent');
  }
})
