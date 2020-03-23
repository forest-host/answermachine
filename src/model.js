
import { bookshelf } from './bookshelf';

export default bookshelf.Model.extend({

}, {
  find_or_create: async function(data) {
    try {
      await this.where(data).fetch({ require: true });
    } catch {
      return this.forge(data).save();
    }
  }
})
