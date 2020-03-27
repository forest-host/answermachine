
import { v4 as uuid } from 'uuid';
import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import valid_data from '../valid_data';
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
      console.log(post.body);
      let res = await chai.request(server).post(`/v1/recoveries/${post.body.respondent_uuid}`).send({});

      assert.propertyVal(res, 'status', 200);
    })
  })
})
