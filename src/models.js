
import { bookshelf } from './bookshelf';
import require_dir from 'require-dir';

const ucfirst = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

let models = require_dir('./model', { 
  mapValue: function(value, basename) {
    return value.default;
  },
  mapKey: function(key, basename) {
    // Transform file name like this question_answer to QuestionAnswer model name
    return basename.split('_').map(ucfirst).join('');
  },
});

// Register models with bookshelf so we can easily create relations
Object.keys(models).forEach(name => {
  bookshelf.model(name, models[name]);
})

export default models;
