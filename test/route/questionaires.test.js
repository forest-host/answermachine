import chai from 'chai';
import chaiHttp from 'chai-http';
chai.use(chaiHttp);
const assert = chai.assert;

import server from '../../src';

describe("Questionaires", () => {
  /**
   * GET all questionaires
   */
  describe("GET /questionaires", () => {
    it("it should return 404 when requesting all questionaires", async () => {
      let res = await chai.request(server).get('/v1/questionaires');

      assert.equal(res.status, 404);
    });
  });

  /**
   * GET a single questionaires
   */
  describe("GET /questionaires/default", () => {
    it("it should return 404 when requesting a single questionaire", async () => {
      let res = await chai.request(server).get('/v1/questionaires/default');

      assert.equal(res.status, 404);
    });
  });
});
