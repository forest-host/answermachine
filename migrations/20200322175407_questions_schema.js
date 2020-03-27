
exports.up = async function(knex) {
  await knex.schema.createTable('questionaires', table => {
    table.increments();
    table.integer('revision');
    table.string('name');
  });
  await knex.schema.createTable('question_types', table => {
    table.increments();
    table.string('name');
  });

  // Use seperate question table so we can support "other" answers for all questions
  await knex.schema.createTable('questions', table => {
    table.increments();
    table.string('name');
    table.integer('question_type_id').unsigned().references('question_types.id').onDelete('restrict');
  });

  await knex.schema.createTable('questionaires_questions', table => {
    table.integer('questionaire_id').unsigned().references('questionaires.id').onDelete('restrict');
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
  });
  await knex.schema.createTable('question_options', table => {
    table.increments();
    table.string('name');
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
  });
};

exports.down = function(knex) {
  console.log('no way down');
};
