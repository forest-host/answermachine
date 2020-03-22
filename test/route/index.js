export default (server, chai) => {
  describe("Index", () => {
    describe("GET /", () => {

      it("should return status 200 and say hi", done => {
        chai.request(server)
          .get('/v1')
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.eql({ 'say': 'hi' });
            done();
          });
      });
    });

  });
}
