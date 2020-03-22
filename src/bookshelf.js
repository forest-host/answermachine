
import Bookshelf from 'bookshelf';
import Knex from 'knex';
import { knex as config } from 'config';

export const knex = Knex(config);
export const bookshelf = Bookshelf(knex);


