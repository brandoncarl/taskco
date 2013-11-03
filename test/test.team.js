"use strict";

// ### Team test suite


var vars = {}

describe("Team Module", function() {

  before(function(done) {
    flushRedis(done);
  });


  describe("#constructor", function() {

    it("creates a team with default options", function() {
      var factory = vars.factory = new Factory("custom"),
          name = vars.name = "email",
          template = {
            work: function (task, done) {
              done();
            }
          };

      var procedure = new Procedure(factory, name, template);
      var team = new Team(factory, name, procedure, {});

      expect(team.name).to.equal(name);
      expect(team.factory).to.equal(factory);
      expect(team.prefix).to.equal(factory.prefix + 'teams:' + name);
      expect(team.availability).to.equal(1);
      expect(team.workers).to.exist;
      // TODO: We need to make sure the .id and .key are set correctly, but first the Team needs to provide some error handling
    });

    it("creates a team of 5", function() {
      vars.team = new Team(vars.factory, vars.name, vars.procedure, {maxWorkers: 5});
      expect(vars.team.availability).to.equal(5);
    });

  });


  describe("#serialize", function() {

    it("serializes the team object for storage", function() {
      var serialized = vars.team.serialize()

      expect(serialized.name).to.equal(vars.name);
      expect(serialized.availability).to.equal(5);
    });

  });


  describe("#start", function() {

    it("checks availability announcement", function(done) {
      var timesCalled = 0;
      vars.team.on('available', function(team) {
        timesCalled++;
        if(team.availability === 1) {
          expect(timesCalled).to.equal(5);
          vars.team.removeAllListeners();
          done();
        }
      });
      vars.team.start();
    });

  });


  describe("#delegate", function() {

    it("creates a worker with given id", function() {
      vars.team.delegate('test');
      expect(vars.team.workers['test']).to.exist;
    });

  });


  describe("#terminate", function() {

    it("worker terminates correctly", function() {
      vars.team.delegate('test');
      vars.team.terminate('test');
      expect(vars.team.workers['test']).to.not.exist;
    });

  });

});
