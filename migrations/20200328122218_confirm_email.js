
exports.up = async function(knex) {
  await knex.schema.alterTable('respondents', table => {
    table.boolean('email_confirmed');
  });
};

exports.down = function(knex) {
  
};
