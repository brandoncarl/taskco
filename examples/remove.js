
// Demonstrates a job with manual remove

var TaskCo = require('../index.js').setup(),
    i = 0;

var processEmail = {
  work: function(task, done) {
    setTimeout(done, 50);
  },
};

TaskCo.addProcedure('email', processEmail).andTeam(1);


TaskCo.createTask('email', {}).then(function(task) {
  task.on('success', function() {
    console.log("COMPLETED...ATTEMPTING TO REMOVE");
    task.remove().then(function() { console.log("REMOVED"); });
  });

  task.save();
}).otherwise(function(err) { console.log(err); });
