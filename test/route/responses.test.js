
import { v4 as uuid } from 'uuid';
import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import server from '../../src';

describe("Responses", () => {
  const valid_response_data = {
    'locale': 'nl_nl',
    'email': 'symptotrack@forest.host',

    // coordinates
    'coordinates': [ 7.104480, 60.092876 ],
  }

  const valid_questionaire_data = {
    // number, year
    'year_of_birth': 1987,
    // select
    'sex': 'non-binary',
    // bool
    'fever': true,
    // number, temperature
    'fever_degrees': 37.3,
    // bool
    'dry_cough': false,
    // bool
    'fatigue': false,
    // number
    'home_leaves': 10,
    // multiselect, countries
    'travel_last_weeks': [ 'NLD', 'CHN' ]
  };

  const valid_data = Object.assign({}, valid_questionaire_data, valid_response_data);

  describe('POST /responses/non_existant', () => {
    /**
     * Non-existant questionaire
     */
    it('should return 404', async () => {
      let res = await chai.request(server).post('/v1/responses/non_existant').send({});
      assert.equal(res.status, 404);
    })
  })

  describe("POST /responses/:questionaire_name", () => {
    it('should error on invalid locales', async () => {
      let res = await chai.request(server).post('/v1/responses/basic').send({ locale: 'en_zs' });

      assert.equal(res.status, 400);
    })

    it("should return respondent_uuid", async () => {
      let res = await chai.request(server).post('/v1/responses/basic').send(valid_data);

      assert.equal(res.status, 200);
      assert.typeOf(res.body.respondent_uuid, 'string'); // our magic link
    });

    it("should return errors for missing required fields", async () => {
      let res = await chai.request(server).post('/v1/responses/basic').send({ locale: 'nl_nl' })

      assert.equal(res.status, 400);
      assert.propertyVal(res.body, 'year_of_birth', 'required'); // Every field is returned in errors with a message
    });

    /**
     * Validation errors
     */
    it("should return error when validation errors occur", async () => {
      let res = await chai.request(server).post('/v1/responses/basic')
        .send({
          'locale': 'nl_nl',
          'email': 'notmyemail',
          'coordinates': [ 40000, 40000 ], // Covid is not yet a problem in space, invalid coordinates
          'year_of_birth': 'long ago', // Should be year
          'sex': 'can be anything',
          'fever': false,
          'fever_degrees': 66.67666, // Should be number with 1 decimal, also 'fever' is false so we dont expect this answer
          'dry_cough': 'string', // should be bool
          'home_leaves': 10.111, // no decimals
          'travel_last_2_weeks': [ 'Trisolaris' ] // Country does not exist, also not an ALPHA-3
        });

      assert.equal(res.status, 400);
    });
  });

  describe('GET /responses/:respondent_uuid', () => {
    it('returns 404 on invalid respondent', async () => {
      let res = await chai.request(server).get('/v1/responses/1805612')

      assert.equal(res.status, 404);
    })

    it('returns 404 on unknown respondent', async () => {
      let fake = uuid();
      let res = await chai.request(server).get(`/v1/responses/${fake}`)

      assert.equal(res.status, 404);
    })
    
    it('returns last responses for questionaires respondent submitted', async () => {
      let res = await chai.request(server).post('/v1/responses/basic').send(valid_data);

      res = await chai.request(server).get(`/v1/responses/basic/${res.body.respondent_uuid}`);

      assert.equal(res.status, 200);
      assert.deepEqual(res.body, valid_questionaire_data);
    })
  })
});
