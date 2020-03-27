
import config from 'config';

if(process.env.NODE_ENV != 'testing') {
  config.knex.connection.host = process.env.DATABASE_MAIN_HOST;
  config.knex.connection.user = process.env.DATABASE_MAIN_USER;
  config.knex.connection.password = process.env.DATABASE_MAIN_PASSWORD;
  config.knex.connection.database = process.env.DATABASE_MAIN_DATABASE;

  config.elastic.node = `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`
}

export default config;

