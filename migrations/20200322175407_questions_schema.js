
exports.up = async function(knex) {
  await Promise.all([
    knex.schema.createTable('questionaires', table => {
      table.uuid('id').primary();
      table.string('name');
    }),
    knex.schema.createTable('question_types', table => {
      table.uuid('id').primary();
      table.string('name');
    }),
  ])

  await knex.schema.createTable('questions', table => {
    table.uuid('id').primary();
    table.string('name');
    table.boolean('required');
    table.boolean('other');
    table.string('tag');
    table.uuid('question_type_id').references('question_types.id').onDelete('restrict');
  });

  await knex.schema.createTable('question_number_meta', table => {
    table.uuid('question_id').references('questions.id').onDelete('restrict');
    table.integer('decimals');
  });

  await knex.schema.createTable('answers', table => {
    table.uuid('id').primary();
    table.string('name');
    table.uuid('question_id').references('questions.id').onDelete('restrict');
  });

  return knex.schema.createTable('question_conditionals', table => {
    table.uuid('question_id').references('questions.id').onDelete('restrict');
    table.uuid('answer_id').references('answers.id').onDelete('restrict');
  });
};

exports.down = function(knex) {
  console.log('no way down');
};
