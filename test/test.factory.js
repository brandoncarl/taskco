
// ### Factory test suite


var vars = {
  factories : [],
  tasks : []
}

describe("Factory Module", function() {

  before(function(done) {
    flushRedis(done);
  });

  describe("#constructor", function() {

    it("creates a factory", function() {
      var name = "custom";
      vars.factories[0] = new Factory(name);
      expect(vars.factories[0].name).to.equal(name);
      expect(vars.factories[0].prefix).to.equal("tc:" + name + ":");
      expect(vars.factories[0].broker).to.exist;
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
      var p = vars.factories[0].getNextId("turnip");
      p.should.eventually.equal(1)
      p.then(function() {
        p = vars.factories[0].getNextId("turnip");
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

      var output = vars.factories[0].addProcedure("noop", input);
      expect(output.name).to.equal("noop");
      expect(output.work).to.deep.equal(input.work);
    });

    it("pukes on no work", function() {
      var input = {
        worky: function(task, done) {
          done();
        }
      }

      badFxn = function() { return vars.factories[0].addProcedure("badOp", input); }
      expect(badFxn).to.throw(Error);
    });

    it("pukes on reserved words", function() {
      var input = {
        name: "Hiya",
        work: function(task, done) {
          done();
        }
      }

      badFxn = function() { return vars.factories[0].addProcedure("badOp", input); }
      expect(badFxn).to.throw(Error);
      expect(Object.keys(vars.factories[0].procedures)).to.have.length(1)
    });
  });


  describe("#createTask", function() {

    it("creates a task", function(done) {
      vars.factories[0].createTask("noop", {}).then(function(task) {
        vars.tasks[0] = task;
        task.id.should.be.a('number');
        done()
      });
    });


    it("creates a task with data", function(done) {
      vars.factories[0].createTask("noop", { home : 'heartIs' }).then(function(task) {
        vars.tasks[1] = task;
        task.id.should.be.a('number');
        done()
      });
    });


    it("creates a task with a uid", function(done) {
      vars.factories[0].createTask("noop", { uid : 'anotherTask' }).then(function(task) {
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
      vars.factories[0].saveTask(vars.tasks[0]).should.be.fulfilled.and.notify(done);
    });

    it("saves a task with data", function(done) {
      vars.factories[0].saveTask(vars.tasks[1]).should.be.fulfilled.and.notify(done);
    });

    it("saves a task with a uid", function(done) {
      vars.factories[0].saveTask(vars.tasks[2]).should.be.fulfilled.and.notify(done);
    });


  });


});

