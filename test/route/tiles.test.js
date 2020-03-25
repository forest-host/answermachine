import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import server from '../../src';

import faker from 'faker';
import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';
const elastic = new Client({ node: config.node });


/**
 * Generate fake entries
 * @param number entries to generate
 * @return array
 */
const generate_entries = function(total) {
  let index_switch = false;
  return [...new Array(total*2)].map(() => {
    if(index_switch) {
      index_switch = false;
      return {
        fatigue: faker.random.boolean(),
        fever: faker.random.boolean(),
        dry_cough: faker.random.boolean(),
        created_at: faker.date.recent(),
        respondend_id: faker.random.uuid(),
        location: {
          'lat': faker.random.number({ max: 52.503, min: 51.517, precision: 0.001 }),
          'lon': faker.random.number({ max: 6.141, min: 4.489, precision: 0.001 }),
        }
      };
    } else {
      index_switch = true;
      return { index: {} };
    }
  });
}

/**
 * Helper function counts number of records with fever from test data
 * @param array
 * @param string key to match (counts when key == true)
 * @return number
 */
const count_on_key = function(data, key) {
  return data.reduce((t, i) => ((i[key]==true) ? t+1 : t), 0);
}


describe("Tiles", () => {
  let responses;
  /**
   * Add data to Elastic index
   */
  before( async () => {
    responses = generate_entries(10);
    await elastic.bulk({
      index: config.index,
      refresh: true,
      body: responses
    });
  });

  after( async () => {
    await elastic.deleteByQuery({
      index: config.index,
      body: {
        query: {
          match_all: {}
        }
      }
    });
  });

  describe("GET /data/tiles", () => {

    it("should return 400 when no parameters are passed", async () => {
      let res = await chai.request(server).get('/v1/data/tiles');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'required');
      assert.equal(res.body.errors.top, 'required');
      assert.equal(res.body.errors.left, 'required');
      assert.equal(res.body.errors.bottom, 'required');
      assert.equal(res.body.errors.right, 'required');
    });

    it("should return error when zoom is below minimum", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=4&top=50&left=5&bottom=52&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'out of bounds');
    });

    it("should return error when zoom is above maximum", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=11&top=50&left=5&bottom=52&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'out of bounds');
    });

    it("should return error when latitude is invalid", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=5&top=91&left=5&bottom=-91&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.top, 'out of bounds');
      assert.equal(res.body.errors.bottom, 'out of bounds');
    });

    it("should return error when longitude is invalid", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=11&top=50&left=181&bottom=52&right=-181');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.left, 'out of bounds');
      assert.equal(res.body.errors.right, 'out of bounds');
    });

    it("should return all tiles and counts per filter within boundary", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=8&top=52.504&left=4.490&bottom=51.518&right=6.142');

      assert.equal(res.status, 200);
      assert.equal(res.body.hits, (responses.length / 2));
      assert.isArray(res.body.tiles);
      assert.hasAllKeys(res.body.tiles[0], ['key', 'hits', 'fever', 'dry_cough', 'fatigue']);
      assert.equal(res.body.tiles.reduce((t, i) => (t+i.hits), 0), (responses.length / 2));
      // Calculate total number of fever and compage with given test responses, this validates the bucket counts
      assert.equal(res.body.tiles.reduce((t, i) => (t+i.fever), 0), count_on_key(responses, 'fever'));
    });


    /**
     * @TODO Data specific: check if aggregations return expected counts for each sympton
     */

  });
});
