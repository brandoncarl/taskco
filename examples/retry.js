
// Demonstrates a task with "retry" (maxAttempts)

var TaskCo = require('../index.js').setup(),
    i = 0;

var processEmail = {

  // Fake function to simulate work
  work: function(task, done) {
    console.log("WORKING");
    task.on('success', function() { console.log("Completed task!", task.id) });
    task.on('retry', function() { console.log("Retrying"); });
    setTimeout(function() {
      (++i == 3) ? done() :done(new Error("Bad task, yo!"));
    }, 50);
  },

};

TaskCo.addProcedure('email', processEmail, { removeAfter : 5, maxAttempts : 3 }).andTeam(1);
TaskCo.quickEntry('email', {});
