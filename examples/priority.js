
// Example demonstrating how to use priorities

var TaskCo = require('../index.js').setup();


var processEmail = {
  work: function(task, done) {
    console.log(task.data.message, "because I have priority", task.metadata.priority + ".");
    setTimeout(done, 2000);
  }
};


// A procedure can store a default priority. When a task uses "normal", it defers to
// procedure priority.
TaskCo.addProcedure('email', processEmail, { removeAfter : 5, priority : 50 }).andTeam(1);

TaskCo.quickEntry('email', { message : "I should be first" });

setTimeout(function() {
  TaskCo.quickEntry('email', { message : "I should be fourth" }, { priority : 'low' });
  TaskCo.quickEntry('email', { message : "I should be third"  }, { priority : 'medium' });
  TaskCo.quickEntry('email', { message : "I should be second" }, { priority : 'critical' });
}, 100);
