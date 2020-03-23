
import { bookshelf } from './bookshelf';

export default bookshelf.Model.extend({

}, {
  find_or_create: async function(data) {
    try {
      // use await to use try catch
      return await this.where(data).fetch({ require: true });
    } catch(err) {
      return this.forge(data).save();
    }
  }
})
