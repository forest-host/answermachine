import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';
const elastic = new Client({ node: config.node });

exports.up = function(knex) {
  return elastic.indices.create({
    index: config.index,
    body: {
      mappings: {
        properties: config.mapping
      }
    }
  });
};

exports.down = function(knex) {
  console.log("dont be down");
};
