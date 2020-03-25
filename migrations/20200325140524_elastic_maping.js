import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';

exports.up = async function(knex) {
  const elastic = new Client({ node: config.node });

  await elastic.indices.create({
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
