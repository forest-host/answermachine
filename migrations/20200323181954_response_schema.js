
exports.up = async function(knex) {
  await knex.schema.createTable('respondents', table => {
    table.bigIncrements();
    table.uuid('uuid');
  });

  await knex.schema.createTable('responses', table => {
    table.bigIncrements();
    table.bigInteger('respondent_id').unsigned().references('respondents.id').onDelete('cascade');
    table.float('latitude');
    table.float('longitude');
    table.timestamps();
  });

  await knex.schema.createTable('answers', table => {
    table.bigIncrements();
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
  });
  
  await Promise.all([
    knex.schema.createTable('answer_float', table => {
      table.bigInteger('answer_id').unsigned().references('answers.id').onDelete('cascade');
      table.float('value');
    }),
    knex.schema.createTable('answer_integer', table => {
      table.bigInteger('answer_id').unsigned().references('answers.id').onDelete('cascade');
      table.integer('value');
    }),
    knex.schema.createTable('answer_boolean', table => {
      table.bigInteger('answer_id').unsigned().references('answers.id').onDelete('cascade');
      table.boolean('value');
    }),
    knex.schema.createTable('answer_select', table => {
      table.bigInteger('answer_id').unsigned().references('answers.id').onDelete('cascade');
      table.integer('question_option_id').unsigned().references('question_options.id').onDelete('restrict');
    }),
    knex.schema.createTable('answer_date', table => {
      table.bigInteger('answer_id').unsigned().references('answers.id').onDelete('cascade');
      table.date('value');
    }),
    knex.schema.createTable('answer_string', table => {
      table.bigInteger('answer_id').unsigned().references('answers.id').onDelete('cascade');
      table.string('value');
    }),
  ])
};

exports.down = function(knex) {
  console.log('no way down');
};
