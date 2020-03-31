import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;
import faker from 'faker';

import server from '../../src';

import { elastic as config } from 'config';
import { Client } from '@elastic/elasticsearch';
const elastic = new Client({ node: config.node });

import * as symptotrack from '@symptotrack/questions';
const questionaire = symptotrack.get_questionaire('basic');
const questions = symptotrack.get_questions(questionaire);

const filters = function() {
  return Object.keys(questions)
  .filter(question_name => questions[question_name].hasOwnProperty('filter'))
  .reduce((agg, question_name) => {
    return { ...agg, [question_name]: faker.random.boolean() };
  }, {});
}

// Set bounds to create entries in and to run tests on
let bounds = {
  'bottom': 50.584,
  'left': 2.086,
  'top': 53.855,
  'right': 7.549
};

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
        created_at: faker.date.recent(2),
        updated_at: faker.date.recent(2),
        respondend_id: faker.random.uuid(),
        location: {
          'lat': faker.random.number({ max: 53, min: 50, precision: 0.001 }),
          'lon': faker.random.number({ max: 7, min: 3, precision: 0.001 }),
        },
        ...filters()
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


describe("Spots", () => {
  let responses;
  /**
   * Add data to Elastic index
   */
  before( async () => {
    await elastic.deleteByQuery({
      index: config.index,
      body: {
        query: {
          match_all: {}
        }
      }
    });
    responses = generate_entries(10);
    await elastic.bulk({
      index: config.index,
      refresh: true,
      body: responses
    }).catch( err => { console.error(err); });
  });

  after( async () => {
  });

  describe("GET /data/spots", () => {

    it("should return 400 when no parameters are passed", async () => {
      let res = await chai.request(server).get('/v1/data/spots');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'required');
      assert.equal(res.body.errors.top, 'required');
      assert.equal(res.body.errors.left, 'required');
      assert.equal(res.body.errors.bottom, 'required');
      assert.equal(res.body.errors.right, 'required');
    });

    it("should return error when zoom is above maximum", async () => {
      let res = await chai.request(server).get('/v1/data/spots?z=14&top=50&left=5&bottom=52&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.z, 'out of bounds');
    });

    it("should return error when latitude is invalid", async () => {
      let res = await chai.request(server).get('/v1/data/spots?z=5&top=91&left=5&bottom=-91&right=4');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.top, 'out of bounds');
      assert.equal(res.body.errors.bottom, 'out of bounds');
    });

    it("should return error when longitude is invalid", async () => {
      let res = await chai.request(server).get('/v1/data/spots?z=11&top=50&left=181&bottom=52&right=-181');

      assert.equal(res.status, 400);
      assert.equal(res.body.errors.left, 'out of bounds');
      assert.equal(res.body.errors.right, 'out of bounds');
    });

    it("should return all spots and counts per filter within boundary", async () => {
      //let res = await chai.request(server).get(`/v1/data/spots?z=1&top=${bounds.top}&left=${bounds.left}&bottom=${bounds.bottom}&right=${bounds.right}`);
      let res = await chai.request(server).get('/v1/data/spots?z=11&top=54&left=2&bottom=49&right=7');

      assert.equal(res.status, 200);
      assert.equal(res.body.hits, (responses.length / 2));
      assert.isArray(res.body.spots);
      let result_keys = Object.keys(filters());
      assert.hasAllKeys(res.body.spots[0], ['key', 'location', 'hits', 'recovered', ...result_keys]);
      assert.equal(res.body.spots.reduce((t, i) => (t+i.hits), 0), (responses.length / 2));
      // Calculate total number of fever and compage with given test responses, this validates the bucket counts
      assert.equal(res.body.spots.reduce((t, i) => (t+i.fever), 0), count_on_key(responses, 'fever'));
      assert.equal(res.body.spots.reduce((t, i) => (t+i.fatigue), 0), count_on_key(responses, 'fatigue'));
      assert.equal(res.body.spots.reduce((t, i) => (t+i.dry_cough), 0), count_on_key(responses, 'dry_cough'));
      assert.equal(res.body.spots.reduce((t, i) => (t+i.recovered), 0), count_on_key(responses, 'recovered'));
    });

  });
});
