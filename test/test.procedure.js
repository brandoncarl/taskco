"use strict";

// ### Procedure test suite


var vars = {}

describe("Procedure Module", function() {

  before(function(done) {
    flushRedis(done);
  });


  describe("#constructor", function() {

    it("creates a procedure", function() {
      vars.factory = new Factory("custom");
      var name = "email",
          template = {
            work: function (task, done) {
              done();
            }
          };
      var procedure = new Procedure(vars.factory, name, template);
      expect(procedure.name).to.equal(name);
      expect(procedure.factory).to.equal(vars.factory);
      expect(procedure.prefix).to.equal(vars.factory.prefix);
      expect(procedure.work).to.equal(template.work);
      expect(procedure.handlers).to.exist;
    });

    it("copies the handlers over from template", function() {
      var name = "email",
          template = {
            success: function() {},
            failure: function() {},
            work: function(task, done) {
              done();
            }
          },
          totalCopiedHandlers = 0;
      var procedure = new Procedure(vars.factory, name, template);
      for (var key in procedure.handlers) {
          if (procedure.handlers.hasOwnProperty(key)) {
            totalCopiedHandlers++;
          }
      }
      expect(procedure.handlers.success).to.equal(template.success);
      expect(procedure.handlers.failure).to.equal(template.failure);
      expect(totalCopiedHandlers).to.equal(2);
    });

    it("pukes on a wrong template", function() {
      var name = "email",
          template = {
            worky: function (task, done) {
              done();
            }
          };
      badFxn = function() { new Procedure(vars.factory, name, template); };
      expect(badFxn).to.throw(Error);
    });

    it("pukes on a reserved words in template", function() {
      var name = "email",
          reserved = ['prefix', 'name', 'defaults', 'on'],
          work = function(task, done) {
            done();
          },
          keyword,
          template;
      for(var i=0; i<reserved.length; i++) {
        keyword = reserved[i];
        template = {};
        template.work = work;
        template[keyword] = 'Ups…';
        badFxn = function() { new Procedure(vars.factory, name, template); };
        expect(badFxn).to.throw(Error);
      }
    });

  });


  describe("#andTeam", function() {

    it("adds a team to the factory", function() {
      var name = "email",
          template = {
            work: function (task, done) {
              done();
            }
          };
      var teamPrefix = vars.factory.prefix + 'teams:' + name,
          team = new Procedure(vars.factory, name, template).andTeam()
      expect(vars.factory.teams[name]).to.equal(team);
    });

  });

});
