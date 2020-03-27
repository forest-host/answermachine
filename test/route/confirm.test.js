import { v4 as uuid } from 'uuid';
import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import valid_data from '../valid_data';
import server from '../../src';

describe('confirm', () => {
  describe('POST /confirm', () => {
    it('returns 404 for unknown respondent', async () => {
      let res = await chai.request(server).post(`/v1/confirm/${uuid()}`)

      assert.propertyVal(res, 'status', 404);
    })

    it('returns 400 when data is missing', async () => {
      let post = await chai.request(server).post('/v1/responses/basic').send(valid_data);
      let res = await chai.request(server).post(`/v1/confirm/${post.body.respondent_uuid}`).send({});

      assert.propertyVal(res, 'status', 400);
    })

    it('confirms respondents email', async () => {
      let post = await chai.request(server).post('/v1/responses/basic').send(valid_data);
      let res = await chai.request(server).post(`/v1/confirm/${post.body.respondent_uuid}`).send({ 'locale': valid_data.locale, 'email': valid_data.email });

      assert.propertyVal(res, 'status', 200);
    })
  })
})
