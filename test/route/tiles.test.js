import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import server from '../../src';

import faker from 'Faker';
import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';
const elastic = new Client({ node: config.node });


/**
 * Generate fake entries
 * @param number entries to generate
 * @return array
 */
function generate_entries(total) {
  let index_switch = false;
  return [...new Array(total*2)].map(() => {
    if(index_switch) {
      index_switch = false;
      return {
        tired: faker.random.boolean(),
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
function count_sympton(data, key) {
  return data.reduce((t, i) => ((i[key]==true) ? t+1 : t), 0);
}


describe("Tiles", () => {
  describe("GET /data/tiles", () => {
    let responses;

    /**
     * Add data to Elastic index
     */
    before(done => {
      responses = generate_entries(10);
      elastic.bulk({
        index: config.index,
        refresh: true,
        body: responses
      })
        .then( () => done )
        .catch( err => console.log(err) );

    });

    after(done => {
      elastic.deleteByQuery({
        index: config.index,
        body: {
          query: {
            match_all: {}
          }
        }
      })
        .then( () => done );
    });

    /**
     * GET get all tiles??
     */
    it("should return 400 when no parameters are passed", async () => {
      let res = await chai.request(server).get('/v1/data/tiles');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'Parameter is required');
      assert.equal(res.body.errors.top, 'Parameter is required');
      assert.equal(res.body.errors.left, 'Parameter is required');
      assert.equal(res.body.errors.bottom, 'Parameter is required');
      assert.equal(res.body.errors.right, 'Parameter is required');
    });

    // ?z=1&top={LAT}&left={LNG}&bottom={LAT}&right={LNG}

    /**
     * GET error when zoom below minimum
     */
    it("should return error when zoom is below minimum", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=4&top=50&left=5&bottom=52&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'Invalid range');
    });

    /**
     * GET error when zoom above maximum
     */
    it("should return error when zoom is above maximum", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=11&top=50&left=5&bottom=52&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'Invalid range');
    });

    /**
     * GET error when latitude is out of bounds
     */
    it("should return error when latitude is invalid", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=5&top=91&left=5&bottom=-91&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.top, 'Invalid range');
      assert.equal(res.body.errors.bottom, 'Invalid range');
    });

    /**
     * GET error when longitude is out of bounds
     */
    it("should return error when longitude is invalid", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=11&top=50&left=181&bottom=52&right=-181');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.left, 'Invalid range');
      assert.equal(res.body.errors.right, 'Invalid range');
    });

    /**
     * GET all tiles within boundary
     */
    it("should return all tiles and counts per filter within boundary", async () => {
      let res = await chai.request(server).get('/v1/data/tiles?z=8&top=51.517&left=4.489&bottom=52.503&right=6.141');

      assert.equal(res.status, 200);
      assert.equal(res.body.hits, 1000);
      assert.isArray(res.body.tiles);
      assert.hasAllKeys(res.body.tiles[0], ['key', 'hits', 'fever', 'dry_cough', 'tired']);
    });


    /**
     * @TODO Data specific: check if aggregations return expected counts for each sympton
     */

  });
});
