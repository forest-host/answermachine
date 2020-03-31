import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import valid_data from '../valid_data';
import server from '../../src';

describe("Counts", () => {
  describe("GET /data/counts", () => {

    it("should return number of respondents", async () => {
      let res = await chai.request(server).post('/v1/responses/basic').send(valid_data);
      res = await chai.request(server).get('/v1/data/counts');

      assert.equal(res.status, 200);
      assert.isNumber(res.body.count);
    });

  });
});
