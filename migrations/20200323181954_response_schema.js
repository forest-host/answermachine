
exports.up = async function(knex) {
  await Promise.all([
    knex.schema.createTable('respondents', table => {
      table.bigIncrements();
      table.uuid('uuid');
    }),
    knex.schema.createTable('locales', table => {
      table.increments();
      table.string('code', 5);
    }),
  ])

  await knex.schema.createTable('responses', table => {
    table.bigIncrements();
    table.bigInteger('respondent_id').unsigned().references('respondents.id').onDelete('cascade');
    table.integer('questionaire_id').unsigned().references('questionaires.id').onDelete('restrict');
    table.integer('locale_id').unsigned().references('locales.id').onDelete('restrict');
    table.float('latitude');
    table.float('longitude');
    table.timestamps();
  });
  
  await Promise.all([
    knex.schema.createTable('answers_float', table => {
      table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
      table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
      table.float('value');
    }),
    knex.schema.createTable('answers_integer', table => {
      table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
      table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
      table.integer('value');
    }),
    knex.schema.createTable('answers_boolean', table => {
      table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
      table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
      table.boolean('value');
    }),
    knex.schema.createTable('answers_select', table => {
      table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
      table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
      table.integer('question_option_id').unsigned().references('question_options.id').onDelete('restrict');
    }),
    knex.schema.createTable('answers_date', table => {
      table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
      table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
      table.date('value');
    }),
    knex.schema.createTable('answers_string', table => {
      table.integer('question_id').unsigned().references('questions.id').onDelete('restrict');
      table.bigInteger('response_id').unsigned().references('responses.id').onDelete('cascade');
      table.string('value');
    }),
  ])
};

exports.down = function(knex) {
  console.log('no way down');
};
