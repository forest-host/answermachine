
import Bookshelf from 'bookshelf';
import Knex from 'knex';
import config from './config';

export const knex = Knex(config.knex);
export const bookshelf = Bookshelf(knex);

