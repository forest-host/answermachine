
import require_dir from 'require-dir';

let models = require_dir('./model', { 
  mapValue: function(value, basename) {
    return value.default;
  },
  mapKey: function(key, basename) {
    return basename.charAt(0).toUpperCase() + basename.slice(1);
  },
});

export default models;
