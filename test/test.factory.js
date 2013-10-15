
// ### Factory test suite


var vars = {
  tasks : []
}

describe("Factory Module", function() {

  before(function(done) {
    flushRedis(done);
  });

  describe("#constructor", function() {

    it("creates a factory", function() {
      var name = "custom";
      vars.factory = new Factory(name);
      expect(vars.factory.name).to.equal(name);
      expect(vars.factory.prefix).to.equal("tc:" + name + ":");
      expect(vars.factory.broker).to.exist;
    });

    // NEEDS TO BE DONE
    // it("creates a factory with custom connection", function(done) {
    //   try {
    //     var name = "connect",
    //         settings = { port : 6380, host : '127.0.0.1' };
    //   }
    // });

    // NEEDS TO BE DONE
    // it("creates a factory with custom authentication", function() {
    // });

  });


  describe("#getNextId", function() {
    it("gets next ID", function(done) {
      var p = vars.factory.getNextId("turnip");
      p.should.eventually.equal(1)
      p.then(function() {
        p = vars.factory.getNextId("turnip");
        p.should.eventually.equal(2).and.notify(done);
      });
    });
  });


  describe("#addProcedure", function() {

    it("creates a procedure with work", function() {
      var input = {
        work: function(task, done) {
          done();
        }
      }

      var output = vars.factory.addProcedure("noop", input);
      expect(output.name).to.equal("noop");
      expect(output.work).to.deep.equal(input.work);
    });

    it("pukes on no work", function() {
      var input = {
        worky: function(task, done) {
          done();
        }
      }

      badFxn = function() { return vars.factory.addProcedure("badOp", input); }
      expect(badFxn).to.throw(Error);
    });

    it("pukes on reserved words", function() {
      var input = {
        name: "Hiya",
        work: function(task, done) {
          done();
        }
      }

      badFxn = function() { return vars.factory.addProcedure("badOp", input); }
      expect(badFxn).to.throw(Error);
      expect(Object.keys(vars.factory.procedures)).to.have.length(1)
    });
  });


  describe("#createTask", function() {

    it("creates a task", function(done) {
      vars.factory.createTask("noop", {}).then(function(task) {
        vars.tasks[0] = task;
        task.id.should.be.a('number');
        done()
      });
    });


    it("creates a task with data", function(done) {
      vars.factory.createTask("noop", { home : 'heartIs' }).then(function(task) {
        vars.tasks[1] = task;
        task.id.should.be.a('number');
        done()
      });
    });


    it("creates a task with a uid", function(done) {
      vars.factory.createTask("noop", { uid : 'anotherTask' }).then(function(task) {
        vars.tasks[2] = task;
        task.id.should.be.a('number');
        done()
      });
    });

    // it creates a task with options

    // it overrides procedure defaults

  });


  describe("#saveTask", function() {

    it("saves a standard task", function(done) {
      vars.factory.saveTask(vars.tasks[0]).should.be.fulfilled.and.notify(done);
    });

    it("saves a task with data", function(done) {
      vars.factory.saveTask(vars.tasks[1]).should.be.fulfilled.and.notify(done);
    });

    it("saves a task with a uid", function(done) {
      vars.factory.saveTask(vars.tasks[2]).should.be.fulfilled.and.notify(done);
    });

    it("doesn't saves a task with same uid", function(done) {
      vars.factory.saveTask(vars.tasks[2]).should.be.rejected.and.notify(done);
    });
  });


  describe("#quickEntry", function() {

    it("saves a task", function(done) {
      vars.factory.quickEntry("noop")
      .then(function(task) { vars.tasks[3] = task; done() });
    });

    it("saves a task with data", function(done) {
      vars.factory.quickEntry("noop", { hi : "there" }).then(function(task) { vars.tasks[4] = task; done() });
    });

    it("saves a task with uid", function(done) {
      vars.factory.quickEntry("noop", { uid : "goaway" }).then(function(task) { vars.tasks[5] = task; done() });
    });

    it("doesn't saves a task with same uid (but doesn't throw error)", function(done) {
      vars.factory.quickEntry("noop", { uid : "goaway" })
      .then(function(task) { vars.tasks[6] = task; done() })
      .otherwise(function(err) { done(); });
    });
  });


  describe("#getTask", function() {
    it("retrieves good tasks by id", function(done) {

      vars.factory.getTask(vars.tasks[0].id)

      .then(function(task) {
        return vars.factory.getTask(vars.tasks[1].id)
      })

      .then(function(task) {
        return vars.factory.getTask(vars.tasks[2].id)
      })

      .then(function(task) {
        return vars.factory.getTask(vars.tasks[3].id)
      })

      .then(function(task) {
        return vars.factory.getTask(vars.tasks[4].id)
      })

      .then(function(task) {
        return vars.factory.getTask(vars.tasks[5].id)
      })

      .then(function(task) {
        done();
      });

    });

    it("does not retrieve bad tasks", function(done) {
      var promise = vars.factory.getTask(1000);
      promise.should.be.rejected.and.notify(done);
      promise.then(function() {
        vars.factory.getTask(100).should.be.rejected.and.notify(done);
      });
    });

  });

  describe("#getTaskId", function() {

    it("finds a good task by uid", function(done) {
      vars.factory.getTaskId("noop", "goaway")
      .should.eventually.equal(vars.tasks[5].id.toString()).and.notify(done);
    });

    it("returns an error when not found", function(done) {
      vars.factory.getTaskId("noop", "goaways").should.be.rejected.and.notify(done);
    });


  });

  describe("#getTaskStatus", function() {

  });

  describe("#reserveTaskId", function() {

  });


  describe("#lacksTask", function() {

    it("does not lack a good task by uid", function(done) {
      vars.factory.lacksTask("noop", "goaway")
      .should.be.rejected.and.notify(done);
    });

    it("lacks a missing task", function(done) {
      vars.factory.lacksTask("noop", "goaways")
      .should.be.fulfilled.and.notify(done);
    });

  });


  describe("#addTeam", function() {

  });

});

