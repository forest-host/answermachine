
exports.up = async function(knex) {
  await Promise.all([
    knex.schema.createTable('questionaires', table => {
      table.increments();
      table.string('name');
    }),
    knex.schema.createTable('question_types', table => {
      table.increments();
      table.string('name');
    }),
  ])

  // Use seperate question table so we can support "other" answers for all questions
  await knex.schema.createTable('questions', table => {
    table.increments();
    table.string('name');
    table.boolean('required');
    table.integer('question_type_id').unsigned().references('question_types.id').onDelete('restrict');
  });

  await knex.schema.createTable('question_select_options', table => {
    table.increments();
    table.string('name');
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
  });
};

exports.down = function(knex) {
  console.log('no way down');
};
