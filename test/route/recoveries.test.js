
import { v4 as uuid } from 'uuid';
import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import valid_response_data from '../response_data';
import valid_questionaire_data from '../questionaire_data';
const valid_data = Object.assign({}, valid_questionaire_data, valid_response_data);

import server from '../../src';

describe('Recoveries', () => {
  describe('POST /recoveries/:respondent_uuid', () => {
    it('returns 404 for unknown respondent', async () => {
      let res = await chai.request(server).get(`/v1/responses/${uuid()}`)

      assert.propertyVal(res, 'status', 404);
    })

    it('saves recovery for respondent', async () => {
      // Get respondent id
      let post = await chai.request(server).post('/v1/responses/basic').send(valid_data);
      let res = await chai.request(server).post(`/v1/recoveries/${post.body.respondent_uuid}`).send({});

      assert.propertyVal(res, 'status', 200);
    })
  })
})
