

// Local
var TaskCo = require('../index.js').setup();

// Alternatively, can use URL
// var redisURL = "redis://rediscloud:...";
// var TaskCo = require('../index.js').setup(redisURL);

console.time('tasks');

var i = 0,
    runs = 200;

var processEmail = {
  work: function(task, done) {
    task.once('success', function() {
      console.log('Completed task!', task.id)
      if (++i == runs) console.timeEnd('tasks');
    });
    setTimeout(done, 50);
  },
};


TaskCo.addProcedure('email', processEmail, { removeAfter : 5 }).andTeam(3);

setTimeout(function() {
  for (var i = 0; i < runs; ++i) {
    TaskCo.quickEntry('email', {}).then(function(task) {
      console.log('TASK CREATED WITH ID', task.id);
    }, function(err) {
      console.log("PROBLEM!", err)
    });
  }
}, 500);
