
import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import server from '../../src';

describe("Index", () => {
  describe("GET /", () => {
    it("should return status 200 and say hi", async () => {
      let res = await chai.request(server).get('/v1');

      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { 'say': 'hi' });
    });
  });
});
