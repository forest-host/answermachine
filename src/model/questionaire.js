
import { bookshelf } from '../bookshelf';
import { v4 as uuid } from 'uuid';

export default bookshelf.model('Questionaire', {
  tableName: 'questionaires',

  initialize: function() {
    this.on('creating', () => {
      this.set('id', uuid());
    });
  },
})
