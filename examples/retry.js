
var TaskCo = require('../index.js').setup(),
    i = 0;

var processEmail = {

  work: function(task, done) {

    console.log("WORKING");

    run = function() {
      (++i == 3) ? done() :done(new Error("Bad job, yo!"));
    }

    task.on('success', function() {
      console.log("Completed task!", task.id)
    });

    task.on('retry', function() {
      console.log("Retrying");
    });

    setTimeout(run, 50);
  },

};


TaskCo.addProcedure('email', processEmail, { removeAfter : 5, maxAttempts : 3 }).andTeam(1);
TaskCo.quickEntry('email', {});
