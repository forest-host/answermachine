
exports.up = async function(knex) {
  await knex.schema.createTable('respondents', table => {
    table.bigIncrements();
    table.uuid('uuid');
  });

  await knex.schema.createTable('locales', table => {
    table.increments();
    table.string('code', 5);
  });

  await knex.schema.createTable('responses', table => {
    table.bigIncrements();
    table.bigInteger('respondent_id').unsigned().references('respondents.id').onDelete('cascade');
    table.integer('questionaire_id').unsigned().references('questionaires.id').onDelete('restrict');
    table.integer('locale_id').unsigned().references('locales.id').onDelete('restrict');
    table.timestamps();
  });
  
  await knex.schema.createTable('answers_float', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.float('value');
  });
  await knex.schema.createTable('answers_integer', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.integer('value');
  });
  await knex.schema.createTable('answers_boolean', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.boolean('value');
  });
  await knex.schema.createTable('answers_select', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.integer('question_option_id').unsigned().references('question_options.id').onDelete('restrict');
  });
  await knex.schema.createTable('answers_date', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.date('value');
  });
  await knex.schema.createTable('answers_string', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.string('value');
  });
  await knex.schema.createTable('answers_coordinates', table => {
    table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
    table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
    table.float('latitude');
    table.float('longitude');
  });
};

exports.down = function(knex) {
  console.log('no way down');
};
