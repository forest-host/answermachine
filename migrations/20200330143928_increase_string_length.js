
exports.up = function(knex) {
  return knex.schema.alterTable('answers_string', table => {
    table.string('value', 4096).alter();
  })
};

exports.down = function(knex) {
  console.log('no way down');
};
