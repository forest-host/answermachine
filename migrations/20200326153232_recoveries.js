
exports.up = function(knex) {
  return knex.schema.createTable('recoveries', table => {
    table.timestamps();
    table.bigInteger('respondent_id').unsigned().references('respondents.id');
  });
};

exports.down = function(knex) {
  console.log('nope');
};
